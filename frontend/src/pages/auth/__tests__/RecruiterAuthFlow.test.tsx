import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RecruiterLoginPage } from '../RecruiterLoginPage';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import * as authHook from '../../../hooks/useAuth';

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Recruiter Role Validation & Dashboard Access Regressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Recruiter login with valid credentials successfully redirects to /recruiter/dashboard', async () => {
    const mockSignInRecruiter = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      profile: null,
      session: null,
      loading: false,
      error: null,
      signInStudent: vi.fn(),
      signUpStudent: vi.fn(),
      signInRecruiter: mockSignInRecruiter,
      signInDemoRecruiter: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      clearError: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/recruiter/login']}>
        <RecruiterLoginPage />
      </MemoryRouter>
    );

    // Verify form rendered
    expect(screen.getByRole('heading', { name: /Recruiter Portal/i })).toBeInTheDocument();

    // Fill the recruiter credentials
    fireEvent.change(screen.getByPlaceholderText('recruiter@company.com'), {
      target: { value: 'saket77@gmail.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Saket7@#' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Sign In as Recruiter/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignInRecruiter).toHaveBeenCalledWith('saket77@gmail.com', 'Saket7@#');
    });

    // Verify redirection directly to /recruiter/dashboard
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/recruiter/dashboard', { replace: true });
    });
  });

  it('2. Student account attempting recruiter login is rejected with clear role error', async () => {
    const mockSignInRecruiter = vi.fn().mockRejectedValue(
      new Error('This is a student account. Please use Student Login.')
    );

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      profile: null,
      session: null,
      loading: false,
      error: null,
      signInStudent: vi.fn(),
      signUpStudent: vi.fn(),
      signInRecruiter: mockSignInRecruiter,
      signInDemoRecruiter: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      clearError: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/recruiter/login']}>
        <RecruiterLoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('recruiter@company.com'), {
      target: { value: 'student@education.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'StudentPass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In as Recruiter/i }));

    await waitFor(() => {
      expect(
        screen.getByText('This is a student account. Please use Student Login.')
      ).toBeInTheDocument();
      expect(screen.getByText('Student Account Detected')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Student Login/i })).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/recruiter/dashboard', expect.anything());
  });

  it('3. ProtectedRoute denies student accounts from recruiter-only dashboard routes', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'student-456', email: 'student@education.com' },
      profile: {
        id: 'student-456',
        email: 'student@education.com',
        full_name: 'Priyanshu Student',
        role: 'student',
      },
      session: { access_token: 'student-jwt' },
      loading: false,
      error: null,
      signInStudent: vi.fn(),
      signUpStudent: vi.fn(),
      signInRecruiter: vi.fn(),
      signInDemoRecruiter: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      clearError: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/recruiter/dashboard']}>
        <Routes>
          <Route
            path="/recruiter/dashboard"
            element={
              <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                <div>Confidential Recruiter Workspace</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Verify access restriction boundary
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.getByText(/This section is restricted to authorized/i)).toBeInTheDocument();
    expect(screen.queryByText('Confidential Recruiter Workspace')).not.toBeInTheDocument();
  });

  it('4. Active recruiter session displays session card with direct dashboard navigation', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'recruiter-777', email: 'saket77@gmail.com' },
      profile: {
        id: 'recruiter-777',
        email: 'saket77@gmail.com',
        full_name: 'Saket Recruiter',
        role: 'recruiter',
      },
      session: { access_token: 'valid-recruiter-jwt' },
      loading: false,
      error: null,
      signInStudent: vi.fn(),
      signUpStudent: vi.fn(),
      signInRecruiter: vi.fn(),
      signInDemoRecruiter: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      clearError: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/recruiter/login']}>
        <RecruiterLoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Active Session: saket77@gmail.com/i)).toBeInTheDocument();
    expect(screen.getByText(/You are already signed in/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dashboard/i })).toHaveAttribute(
      'href',
      '/recruiter/dashboard'
    );
  });

  it('5. Empty input validation prevents empty submission', async () => {
    const mockSignInRecruiter = vi.fn();

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      profile: null,
      session: null,
      loading: false,
      error: null,
      signInStudent: vi.fn(),
      signUpStudent: vi.fn(),
      signInRecruiter: mockSignInRecruiter,
      signInDemoRecruiter: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      clearError: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/recruiter/login']}>
        <RecruiterLoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Sign In as Recruiter/i }));

    expect(
      screen.getByText('Please enter both your recruiter email and password.')
    ).toBeInTheDocument();
    expect(mockSignInRecruiter).not.toHaveBeenCalled();
  });

  it('6. One-click Continue as Demo Recruiter authenticates and redirects to /recruiter/dashboard', async () => {
    const mockSignInDemoRecruiter = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      profile: null,
      session: null,
      loading: false,
      error: null,
      signInStudent: vi.fn(),
      signUpStudent: vi.fn(),
      signInRecruiter: vi.fn(),
      signInDemoRecruiter: mockSignInDemoRecruiter,
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      clearError: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/recruiter/login']}>
        <RecruiterLoginPage />
      </MemoryRouter>
    );

    // Verify supporting text is displayed
    expect(
      screen.getByText(/Evaluating HireFlow\? Continue directly to the recruiter demo\./i)
    ).toBeInTheDocument();

    // Click Continue as Demo Recruiter button
    const demoButton = screen.getByRole('button', { name: /Continue as Demo Recruiter/i });
    expect(demoButton).toBeInTheDocument();
    fireEvent.click(demoButton);

    await waitFor(() => {
      expect(mockSignInDemoRecruiter).toHaveBeenCalledTimes(1);
    });

    // Verify redirection to recruiter dashboard
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/recruiter/dashboard', { replace: true });
    });
  });

  it('7. Error during one-click demo login renders clear error notice and does not redirect', async () => {
    const mockSignInDemoRecruiter = vi.fn().mockRejectedValue(
      new Error('Unable to establish demo recruiter session. Please verify server configuration.')
    );

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      profile: null,
      session: null,
      loading: false,
      error: null,
      signInStudent: vi.fn(),
      signUpStudent: vi.fn(),
      signInRecruiter: vi.fn(),
      signInDemoRecruiter: mockSignInDemoRecruiter,
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      clearError: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/recruiter/login']}>
        <RecruiterLoginPage />
      </MemoryRouter>
    );

    const demoButton = screen.getByRole('button', { name: /Continue as Demo Recruiter/i });
    fireEvent.click(demoButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Unable to establish demo recruiter session/i)
      ).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

