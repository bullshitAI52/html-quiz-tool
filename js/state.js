import { STORAGE_KEY } from './config.js';

export const state = {
    libraries: [],
    currentLibraryIndex: 0,
    currentIndex: 0,
    mode: 'practice',
    isShuffled: false,
    currentTab: 'practice',
    examMode: false,
    examScore: 0,
    examAnswers: {},
    examQuestions: [],
    examHistory: [],
    practiceQuestions: [],
    practiceAnswers: {},
    questionFontSize: 12, // 题目字体大小
    optionFontSize: 12,   // 选项字体大小
    isDarkMode: false,    // 是否为深夜模式
    examTimeLeft: 90 * 60, // 90分钟，以秒为单位
    examTimer: null,
    questionOrders: {
        single: 'sequential',
        multi: 'sequential',
        judge: 'sequential'
    },
    examStarted: false,

    // 练习错题库数据
    practiceWrongQuestions: [],
    practiceWrongCurrentIndex: 0,
    practiceWrongMode: 'practice', // 练习错题库模式：practice 或 back

    // 考试错题库数据
    examWrongQuestions: [],
    examWrongCurrentIndex: 0,
    examWrongMode: 'practice', // 考试错题库模式：practice 或 back

    // 题目练习次数记录
    questionPracticeCounts: {},
    correctCounts: {},

    // 错题库多选题选中状态 - 用于临时存储当前题目的选择状态
    practiceWrongMultiSelectAnswers: {},
    examWrongMultiSelectAnswers: {}
};

// Helper: Get Current Library
export function getCurrentLibrary() {
    if (state.libraries.length === 0) return null;
    return state.libraries[state.currentLibraryIndex];
}
