import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface SkillsInputProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const SkillsInput: React.FC<SkillsInputProps> = ({
  skills = [],
  onChange,
  placeholder = 'Add a skill and press Enter (e.g. React, TypeScript)...',
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const addSkill = (rawSkill: string) => {
    const cleaned = rawSkill.trim();
    if (!cleaned) return;

    // Check duplicate case-insensitively
    const exists = skills.some((s) => s.toLowerCase() === cleaned.toLowerCase());
    if (exists) {
      setInputError(`"${cleaned}" has already been added.`);
      return;
    }

    setInputError(null);
    onChange([...skills, cleaned]);
    setInputValue('');
  };

  const removeSkill = (indexToRemove: number) => {
    onChange(skills.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(inputValue);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (inputError) setInputError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
        />
        <button
          type="button"
          onClick={() => addSkill(inputValue)}
          disabled={!inputValue.trim()}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {inputError && <p className="text-xs text-rose-600 font-medium">{inputError}</p>}

      {/* Skills Chips */}
      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {skills.map((skill, index) => (
            <span
              key={`${skill}-${index}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium transition-all group"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(index)}
                aria-label={`Remove ${skill}`}
                className="text-indigo-400 hover:text-indigo-700 rounded-full hover:bg-indigo-100 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">No skills added yet. Add relevant technical and domain skills.</p>
      )}
    </div>
  );
};
