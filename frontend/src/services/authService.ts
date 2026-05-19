const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface RegisterData {
    email: string;
    nom_complet: string;
    numero_telephone: string;
    password: string;
    date_naissance: string;
    document_identite?: string;
    nationalite?: string;
    sexe?: 'masculin' | 'feminin';
    langue_preferee?: string;
}

export interface LoginData {
    username: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface UserResponse {
    id: number;
    username: string;
    email: string;
    numero_telephone: string | null;
    nom_complet: string | null;
    photo_profil: string | null;
    date_naissance: string | null;
    document_identite: string | null;
    nationalite: string | null;
    sexe: string | null;
    langue_preferee: string;
    is_active: boolean;
    is_superuser: boolean;
    notification_email: boolean;
    notification_sms: boolean;
}

export interface ForgotPasswordData {
    email: string;
}

export interface VerifyOTPData {
    email: string;
    otp: string;
}

export interface ResetPasswordData {
    email: string;
    otp: string;
    new_password: string;
}

export const authService = {
    /**
     * Register a new user
     */
    register: async (data: RegisterData): Promise<UserResponse> => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
        }

        return response.json();
    },

    /**
     * Login with email/username and password
     */
    login: async (data: LoginData): Promise<AuthResponse> => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        const tokens = await response.json();

        // Store tokens in localStorage
        localStorage.setItem('access_token', tokens.access_token);
        localStorage.setItem('refresh_token', tokens.refresh_token);

        return tokens;
    },

    /**
     * Get Google OAuth login URL
     */
    getGoogleAuthUrl: async (): Promise<string> => {
        const response = await fetch(`${API_URL}/auth/google/login`);

        if (!response.ok) {
            throw new Error('Failed to get Google auth URL');
        }

        const data = await response.json();
        return data.auth_url;
    },

    /**
     * Request password reset - sends OTP to email
     */
    forgotPassword: async (data: ForgotPasswordData): Promise<void> => {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to send OTP');
        }
    },

    /**
     * Verify OTP for password reset
     */
    verifyOTP: async (data: VerifyOTPData): Promise<void> => {
        const response = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Invalid or expired OTP');
        }
    },

    /**
     * Reset password with OTP
     */
    resetPassword: async (data: ResetPasswordData): Promise<void> => {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to reset password');
        }
    },

    /**
     * Get current user info
     */
    getCurrentUser: async (): Promise<UserResponse> => {
        const token = localStorage.getItem('access_token');

        if (!token) {
            throw new Error('No access token found');
        }

        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Try to refresh token
                await authService.refreshToken();
                return authService.getCurrentUser();
            }
            throw new Error('Failed to get user info');
        }

        return response.json();
    },

    /**
     * Refresh access token
     */
    refreshToken: async (): Promise<AuthResponse> => {
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
            throw new Error('No refresh token found');
        }

        const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
            // Refresh token is invalid, logout user
            authService.logout();
            throw new Error('Session expired');
        }

        const tokens = await response.json();

        // Update tokens in localStorage
        localStorage.setItem('access_token', tokens.access_token);
        localStorage.setItem('refresh_token', tokens.refresh_token);

        return tokens;
    },

    /**
     * Logout user
     */
    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated: (): boolean => {
        return !!localStorage.getItem('access_token');
    },

    /**
     * Get access token
     */
    getAccessToken: (): string | null => {
        return localStorage.getItem('access_token');
    },
};
