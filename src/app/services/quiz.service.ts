import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './enviroment';

export interface DtoGetExam {
  id?: number;
  title?: string;
  examTitle?: string;
  startTime?: string | Date;
  durationInMinutes?: number; // in minutes
  courseId?: number;
  courseName?: string;
  currentQuestionId?: number;
  userFinished?: boolean;
  [key: string]: any;
}

export interface DtoAddExam {
  examTitle: string;
  startTime: string | Date;
  duration: number;
  courseId?: number;
}

export interface DtoAnswer {
  id?: number;
  answerId: number;
  answerText: string;
  isCorrect: boolean;
}

export interface DtoExamQuestion {
  questionId?: number;
  questionText: string;
  Mark: number;
  options: DtoAnswer[];
}

export interface DtoAddExamQuestions {
  examId: number;
  questions: DtoExamQuestion[];
}

export interface DtoGetExamQuestions {
  examTitle: string;
  questions: DtoExamQuestion[];
}

export interface DtoQuestionAnswer {
  questionId: number;
  answerId: number;
}

export interface DtoSubmitExamAnswers {
  examId: number;
  questionId: number;
  answerId: number;
}

export interface DtoReturnExamScore {
  totalScore: number;
  obtainedScore: number;
  totalQuestions: number;
  totalSubmittedQuestions: number;
  rightAnswers: number;
  wrongAnswers: number;
}

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  private apiUrl = `${environment.horizon}`;

  constructor(private http: HttpClient) {}

  getUpcomingExams(): Observable<DtoGetExam[]> {
    return this.http.get<DtoGetExam[]>(`${this.apiUrl}/GetUpcomingExams`);
  }

  getAllExams(): Observable<DtoGetExam[]> {
    return this.http.get<DtoGetExam[]>(`${this.apiUrl}/GetAllExams`);
  }

  addExam(exam: DtoAddExam): Observable<any> {
    return this.http.post(`${this.apiUrl}/AddExam`, exam);
  }

  getAllCourses(): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetAllCourses`);
  }

  deleteExam(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/DeleteExam?id=${id}`);
  }

  addExamQuestions(questions: DtoAddExamQuestions): Observable<any> {
    return this.http.post(`${this.apiUrl}/AddExamQuestions`, questions);
  }

  getExamQuestions(examId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetExamQuestions?examId=${examId}`);
  }

  submitExamAnswers(submission: DtoSubmitExamAnswers): Observable<any> {
    return this.http.post(`${this.apiUrl}/SubmitExamAnswers`, submission);
  }

  finishExam(examId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/FinishExam?examId=${examId}`);
  }

  getExamResults(examId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetExamResults?examId=${examId}`);
  }

  removeQuestion(questionId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/RemoveQuestion?questionId=${questionId}`);
  }
}
