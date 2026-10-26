export type CourseLesson = { _id: string; title: string; content?: string; videoUrl?: string; locked?: boolean };
export type CourseSection = { _id: string; title: string; lessons: CourseLesson[] };
export type Course = {
  _id: string; title: string; description: string; coverUrl?: string; isPaid: boolean; price?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'hidden'; locked?: boolean;
  teacherId?: { _id?: string; name?: string; email?: string } | string | null;
  sections?: CourseSection[]; slides?: { name: string; dataUrl: string }[];
  presentations?: { _id?: string; title: string; html: string }[];
};
export type CourseProgress = { completedLessons: string[] };
export type CourseRoutes = { Catalog: undefined; Detail: { id: string } };
export type CourseAccessRequest = { _id: string; status: 'pending' | 'approved' | 'rejected'; courseId?: Course; userId?: { _id: string; name: string; email: string } };

export type TestOption = 'A' | 'B' | 'C' | 'D';
export type TestQuestion = { number: number; question: string; options: Record<TestOption, string> };
export type TestQuestionResult = { number: number; selected: TestOption | null; correctAnswer: TestOption; correct: boolean };
export type Test = { _id: string; title: string; level: string; questionCount?: number; questions?: TestQuestion[] };
export type TestResult = { score: number; total: number; percentage: number; results: TestQuestionResult[] };
export type TestRoutes = { Catalog: undefined; Take: { id: string } };
export type TestDraftQuestion = TestQuestion & { answer: TestOption };

export type AdminUser = { _id: string; name?: string; email: string; role: 'student' | 'teacher' | 'admin' };
