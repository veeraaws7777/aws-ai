
export interface UserData {
  name: string;
  email: string;
  phone: string;
}

export interface InterviewResult {
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  questionsAnswered: number;
}

export enum AppStage {
  REGISTRATION = 'REGISTRATION',
  PREPARATION = 'PREPARATION',
  INTERVIEW = 'INTERVIEW',
  COMPLETED = 'COMPLETED'
}
