import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StudentSignupPage } from '../StudentSignupPage';
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

describe('Student Signup & Authentication Flow Regressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Successful student signup redirects directly to /student/dashboard', async () => {
    const mockSignUpStudent = vi.fn().mockResolvedValue({
      session: { access_token: 'fake-token' },
      user: { id: 'student-123', email: 'aditya77@education.com' },
      profile: {
        id: 'student-123',
        email: 'aditya77@education.com',
        full_name: 'Aditya Student',
        role: 'student',
      },
      requiresConfirmation: false,
    });

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      profile: null,
      session: null,
      loading: false,
      error: null,
      signInStudent: vi.fn(),
      signUpStudent: mockSignUpStudent,
      signInRecruiter: vi.fn(),
      signInDemoRecruiter: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      clearError: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/student/signup']}>
        <StudentSignupPage />
      </MemoryRouter>
    );

    // Verify form rendered
    expect(screen.getByText('Create Student Account')).toBeInTheDocument();

    // Fill the signup form
    fireEvent.change(screen.getByPlaceholderText('Jane Doe'), {
      target: { value: 'Aditya Student' },
    });
    fireEvent.change(screen.getByPlaceholderText('jane@university.edu'), {
      target: { value: 'aditya77@education.com' },
    });
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'password123' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Complete Registration/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignUpStudent).toHaveBeenCalledWith(
        'aditya77@education.com',
        'password123',
        'Aditya Student'
      );
    });

    // Check that it redirected directly to /student/dashboard and NOT to /student/login
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/student/dashboard', { replace: true });
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/student/login');
  });

  it('2. An already authenticated student opening the signup page is redirected to the student dashboard', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'student-123', email: 'aditya77@education.com' },
      profile: {
        id: 'student-123',
        email: 'aditya77@education.com',
        full_name: 'Aditya Student',
        role: 'student',
      },
      session: { access_token: 'fake-token' },
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
      <MemoryRouter initialEntries={['/student/signup']}>
        <StudentSignupPage />
      </MemoryRouter>
    );

    // Verify automatic redirect occurred to student dashboard
    expect(mockNavigate).toHaveBeenCalledWith('/student/dashboard', { replace: true });
    // And signup form is not displayed
    expect(screen.queryByText('Create Student Account')).not.toBeInTheDocument();
  });

  it('3. Signup errors are displayed correctly (validation error and backend error)', async () => {
    const mockSignUpStudent = vi.fn().mockRejectedValue(
      new Error('An account with this email address already exists. Please sign in or reset your password.')
    );

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      profile: null,
      session: null,
      loading: false,
      error: null,
      signInStudent: vi.fn(),
      signUpStudent: mockSignUpStudent,
      signInRecruiter: vi.fn(),
      signInDemoRecruiter: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      clearError: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/student/signup']}>
        <StudentSignupPage />
      </MemoryRouter>
    );

    // 3a. Validation error: Mismatched passwords
    fireEvent.change(screen.getByPlaceholderText('Jane Doe'), {
      target: { value: 'Aditya Student' },
    });
    fireEvent.change(screen.getByPlaceholderText('jane@university.edu'), {
      target: { value: 'aditya77@education.com' },
    });
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'different123' } });

    fireEvent.click(screen.getByRole('button', { name: /Complete Registration/i }));

    expect(screen.getByText('Passwords do not match. Please verify and try again.')).toBeInTheDocument();
    expect(mockSignUpStudent).not.toHaveBeenCalled();

    // 3b. Backend error returned on submission
    fireEvent.change(passwordInputs[1], { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Complete Registration/i }));

    await waitFor(() => {
      expect(
        screen.getByText('An account with this email address already exists. Please sign in or reset your password.')
      ).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('4. Recruiter accounts cannot access student-only routes', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'recruiter-999', email: 'recruiter@enterprise.com' },
      profile: {
        id: 'recruiter-999',
        email: 'recruiter@enterprise.com',
        full_name: 'Hiring Manager',
        role: 'recruiter',
      },
      session: { access_token: 'recruiter-token' },
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
      <MemoryRouter initialEntries={['/student/dashboard']}>
        <Routes>
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <div>Secret Student Dashboard Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Must show Access Restricted boundary screen
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(
      screen.getByText(/This section is reserved for/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You are currently signed in with an enterprise/i)
    ).toBeInTheDocument();

    // Must NOT render protected student content
    expect(screen.queryByText('Secret Student Dashboard Content')).not.toBeInTheDocument();
  });

  it('5. If email confirmation is required, informs user and provides correct sign in action', async () => {
    const mockSignUpStudent = vi.fn().mockResolvedValue({
      session: null,
      user: { id: 'pending-user-id', email: 'aditya77@education.com' },
      profile: null,
      requiresConfirmation: true,
    });

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      profile: null,
      session: null,
      loading: false,
      error: null,
      signInStudent: vi.fn(),
      signUpStudent: mockSignUpStudent,
      signInRecruiter: vi.fn(),
      signInDemoRecruiter: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      clearError: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/student/signup']}>
        <StudentSignupPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Jane Doe'), {
      target: { value: 'Aditya Student' },
    });
    fireEvent.change(screen.getByPlaceholderText('jane@university.edu'), {
      target: { value: 'aditya77@education.com' },
    });
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Complete Registration/i }));

    await waitFor(() => {
      expect(screen.getByText('Verification Email Sent')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Proceed to Sign In/i })).toHaveAttribute(
        'href',
        '/student/login'
      );
    });

    // Must NOT navigate to dashboard without confirmed session
    expect(mockNavigate).not.toHaveBeenCalledWith('/student/dashboard', expect.anything());
  });

  it('6. Authenticated recruiter visiting student signup is redirected to recruiter dashboard', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'recruiter-999', email: 'recruiter@enterprise.com' },
      profile: {
        id: 'recruiter-999',
        email: 'recruiter@enterprise.com',
        full_name: 'Hiring Manager',
        role: 'recruiter',
      },
      session: { access_token: 'recruiter-token' },
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
      <MemoryRouter initialEntries={['/student/signup']}>
        <StudentSignupPage />
      </MemoryRouter>
    );

    // Recruiter must be redirected to recruiter dashboard, NEVER to student dashboard
    expect(mockNavigate).toHaveBeenCalledWith('/recruiter/dashboard', { replace: true });
    expect(mockNavigate).not.toHaveBeenCalledWith('/student/dashboard', expect.anything());
  });
});
