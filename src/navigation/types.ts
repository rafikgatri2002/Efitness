export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type HomeStackParamList = {
  MusclesList: undefined;
  Exercises: { muscle: string; emoji: string };
  Session: { exerciseId: string; exerciseName: string; emoji: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  Progress: undefined;
  AICoach: undefined;
};

export type CoachStackParamList = {
  Chat: { conversationId?: string } | undefined;
  Conversations: undefined;
};
