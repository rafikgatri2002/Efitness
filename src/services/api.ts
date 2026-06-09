import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BASE_URL = 'http://192.168.1.139:8000';
const TOKEN_KEY = 'ironlog_token';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  name: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface MuscleItem {
  muscle: string;
  exercise_count: number;
  last_trained?: string | null;
}

export interface Exercise {
  id: string;
  muscle: string;
  name: string;
  emoji: string;
  personal_best?: number | null;
  last_session_summary?: string | null;
  set_count?: number | null;
  image_url?: string | null;
}

export interface SessionSet {
  set_number: number;
  weight_kg: number;
  reps: number;
}

export interface ExerciseDetail {
  id: string;
  muscle: string;
  name: string;
  emoji: string;
  personal_best?: number | null;
  last_session?: {
    id: string;
    notes?: string | null;
    sets: SessionSet[];
  } | null;
}

export interface ProgressOverview {
  total_sessions: number;
  prs_this_month: number;
  week_streak: number;
  per_muscle_breakdown?: Array<{ muscle: string; count: number }>;
  recent_sessions?: Array<{
    id: string;
    date: string;
    duration_minutes?: number;
    muscles: string[];
    exercises_summary: string;
    pr_badge?: string | null;
  }>;
}

export interface ExerciseProgressPoint {
  date: string;
  max_weight: number;
  is_pr: boolean;
}

export interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

export const tokenStorage = {
  key: TOKEN_KEY,
  save: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  remove: () => SecureStore.deleteItemAsync(TOKEN_KEY),
  get: () => SecureStore.getItemAsync(TOKEN_KEY)
};

export const register = async (name: string, email: string, password: string) => {
  const { data } = await api.post<AuthResponse>('/auth/register', { name, email, password });
  return data;
};

export const login = async (email: string, password: string) => {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  return data;
};

export const me = async () => {
  const { data } = await api.get<UserProfile>('/auth/me');
  return data;
};

export const getMuscles = async () => {
  const { data } = await api.get<MuscleItem[]>('/muscles');
  return data;
};

export const getExercisesByMuscle = async (muscle: string) => {
  const { data } = await api.get<Exercise[]>('/exercises', { params: { muscle } });
  return data;
};

export const getExercise = async (id: string) => {
  const { data } = await api.get<ExerciseDetail>(`/exercises/${id}`);
  return data;
};

export const createExercise = async (payload: {
  muscle: string;
  name: string;
  emoji: string;
  image_url?: string;
}) => {
  const { data } = await api.post<Exercise>('/exercises', payload);
  return data;
};

export const deleteExercise = async (id: string) => {
  await api.delete(`/exercises/${id}`);
};

export const getSessions = async (exerciseId: string, limit = 10) => {
  const { data } = await api.get('/sessions', {
    params: { exercise_id: exerciseId, limit }
  });
  return data;
};

export const createSession = async (payload: {
  exercise_id: string;
  workout_id?: string;
  sets: SessionSet[];
  notes?: string;
}) => {
  const { data } = await api.post('/sessions', payload);
  return data;
};

// ── Workouts (training sessions: a titled, day-level container of muscle groups) ──
export interface Workout {
  id: string;
  date: string;
  title: string;
  muscle_groups: string[];
  exercise_count: number;
}

export interface ExerciseInWorkout {
  id: string;
  name: string;
  emoji: string;
  muscle: string;
  logged_set_count: number;
  last_summary?: string | null;
}

export interface MuscleGroupBlock {
  muscle: string;
  exercises: ExerciseInWorkout[];
}

export interface WorkoutDetail {
  id: string;
  date: string;
  title: string;
  muscle_groups: MuscleGroupBlock[];
}

export const getWorkouts = async (params: {
  start?: string;
  end?: string;
  date?: string;
}) => {
  const { data } = await api.get<Workout[]>('/workouts', { params });
  return data;
};

export const createWorkout = async (payload: { date: string; title: string }) => {
  const { data } = await api.post<Workout>('/workouts', payload);
  return data;
};

export const getWorkout = async (id: string) => {
  const { data } = await api.get<WorkoutDetail>(`/workouts/${id}`);
  return data;
};

export const updateWorkout = async (id: string, payload: { title: string }) => {
  const { data } = await api.put<WorkoutDetail>(`/workouts/${id}`, payload);
  return data;
};

export const addMuscleGroup = async (id: string, muscle: string) => {
  const { data } = await api.post<WorkoutDetail>(`/workouts/${id}/muscle-groups`, {
    muscle
  });
  return data;
};

export const removeMuscleGroup = async (id: string, muscle: string) => {
  const { data } = await api.delete<WorkoutDetail>(
    `/workouts/${id}/muscle-groups/${muscle}`
  );
  return data;
};

export const deleteWorkout = async (id: string) => {
  await api.delete(`/workouts/${id}`);
};

export const getProgressOverview = async () => {
  const { data } = await api.get<ProgressOverview>('/progress/overview');
  return data;
};

export interface ExerciseProgress {
  exercise_id: string;
  exercise_name: string;
  emoji: string;
  personal_best: number;
  history: ExerciseProgressPoint[];
}

export const getExerciseProgress = async (exerciseId: string, days = 120) => {
  const { data } = await api.get<ExerciseProgress | ExerciseProgressPoint[]>(
    `/progress/exercise/${exerciseId}`,
    { params: { days } }
  );
  // Backend returns an object wrapping the points under `history`.
  if (Array.isArray(data)) {
    return data;
  }
  return data?.history ?? [];
};

export const sendChat = async (payload: {
  message: string;
  conversation_id?: string;
  reference_labels?: string[];
}) => {
  const { data } = await api.post<{ reply: string; conversation_id: string }>('/chat', payload);
  return data;
};

// ── Conversations (persistent chat memory, import, published references) ──
export interface Conversation {
  id: string;
  title?: string | null;
  source: string; // 'chat' | 'gemini_import'
  is_published: boolean;
  label?: string | null;
  message_count: number;
  has_summary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  seq: number;
  role: 'user' | 'assistant';
  content: string;
  token_count: number;
  created_at: string;
}

export interface ConversationDetail extends Conversation {
  summary?: string | null;
  messages: ConversationMessage[];
}

export const getConversations = async (params?: {
  source?: string;
  is_published?: boolean;
  limit?: number;
  skip?: number;
}) => {
  const { data } = await api.get<Conversation[]>('/conversations', { params });
  return data;
};

export const getConversation = async (
  id: string,
  params?: { limit?: number; skip?: number }
) => {
  const { data } = await api.get<ConversationDetail>(`/conversations/${id}`, { params });
  return data;
};

export const importConversation = async (payload: {
  title?: string;
  raw_text?: string;
  messages?: ChatMessagePayload[];
}) => {
  const { data } = await api.post<Conversation>('/conversations/import', payload);
  return data;
};

export const updateConversation = async (
  id: string,
  payload: { title?: string; is_published?: boolean; label?: string }
) => {
  const { data } = await api.put<Conversation>(`/conversations/${id}`, payload);
  return data;
};

export const getApiErrorMessage = (error: unknown, fallback = 'Something went wrong') => {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
    if (typeof detail === 'string' && detail.trim().length > 0) {
      return detail;
    }
  }
  return fallback;
};
