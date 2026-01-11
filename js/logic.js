import { state, getCurrentLibrary } from './state.js';
import { saveToStorage } from './storage.js';

// Timer variable (module level)
let examTimerInterval = null;

// Helper: Get Current Question
export function getCurrentQuestion() {
    if (state.mode === 'exam' && state.examMode) {
        return state.examQuestions[state.currentIndex];
    } else if (state.mode === 'practiceWrong') {
        return state.practiceWrongQuestions[state.practiceWrongCurrentIndex];
    } else if (state.mode === 'examWrong') {
        return state.examWrongQuestions[state.examWrongCurrentIndex];
    } else {
        const lib = getCurrentLibrary();
        return lib ? lib.questions[state.currentIndex] : null;
    }
}

export function getCurrentPracticeWrongQuestion() {
    return state.practiceWrongQuestions[state.practiceWrongCurrentIndex];
}

export function getCurrentExamWrongQuestion() {
    return state.examWrongQuestions[state.examWrongCurrentIndex];
}

export function determineQuestionType(answer) {
    if (!answer) return '未知';
    const answerStr = answer.toString().trim().toUpperCase();
    if (['对', '错', '正确', '错误', 'TRUE', 'FALSE'].includes(answerStr)) {
        return '判断';
    }
    if (answerStr.replace(/[^A-Z]/g, '').length > 1) {
        return '多选';
    }
    return '单选';
}

export function getQuestionScore(type) {
    switch (type) {
        case '单选': return 0.5;
        case '多选': return 1;
        case '判断': return 1;
        default: return 1;
    }
}

export function switchLibrary(index) {
    if (state.libraries && index >= 0 && index < state.libraries.length) {
        state.currentLibraryIndex = index;
        state.currentIndex = 0;

        // Reset state derived from library
        state.mode = 'practice';
        state.isShuffled = false;

        // Also update ID if we were using it (backward compat)
        if (state.libraries[index].id) {
            state.currentLibraryId = state.libraries[index].id;
        }

        saveToStorage();
        return true;
    }
    return false;
}

export function prevQuestion() {
    if (state.currentIndex > 0) {
        state.currentIndex--;
        saveToStorage();
        return true;
    }
    return false;
}

export function nextQuestion() {
    const maxIndex = state.examMode ?
        state.examQuestions.length - 1 :
        getCurrentLibrary().questions.length - 1;

    if (state.currentIndex < maxIndex) {
        state.currentIndex++;
        saveToStorage();
        return true;
    }
    return false; // Indicates end of list
}

export function prevPracticeWrongQuestion() {
    if (state.practiceWrongCurrentIndex > 0) {
        state.practiceWrongCurrentIndex--;
        delete state.practiceWrongMultiSelectAnswers[state.practiceWrongCurrentIndex + 1];
        return true;
    }
    return false;
}

export function nextPracticeWrongQuestion() {
    const maxIndex = state.practiceWrongQuestions.length - 1;
    if (state.practiceWrongCurrentIndex < maxIndex) {
        state.practiceWrongCurrentIndex++;
        delete state.practiceWrongMultiSelectAnswers[state.practiceWrongCurrentIndex - 1];
        return true;
    }
    return false;
}

export function prevExamWrongQuestion() {
    if (state.examWrongCurrentIndex > 0) {
        state.examWrongCurrentIndex--;
        delete state.examWrongMultiSelectAnswers[state.examWrongCurrentIndex + 1];
        return true;
    }
    return false;
}

export function nextExamWrongQuestion() {
    const maxIndex = state.examWrongQuestions.length - 1;
    if (state.examWrongCurrentIndex < maxIndex) {
        state.examWrongCurrentIndex++;
        delete state.examWrongMultiSelectAnswers[state.examWrongCurrentIndex - 1];
        return true;
    }
    return false;
}

// Logic for Practice Mode Selection
export function selectOption(optionLetter) {
    if (state.mode !== 'practice') return null;

    const currentQuestion = getCurrentQuestion();
    const library = getCurrentLibrary();

    let processedOption = optionLetter;
    if (currentQuestion.类型 === '判断') {
        if (optionLetter === 'A') processedOption = '对';
        else if (optionLetter === 'B') processedOption = '错';
    }

    if (currentQuestion.类型 === '单选' || currentQuestion.类型 === '判断') {
        library.userAnswers[state.currentIndex] = {
            selected: processedOption,
            isCorrect: processedOption === currentQuestion.答案,
            isSubmitted: true
        };
        saveToStorage();
        recordQuestionPractice(currentQuestion.originalIndex || state.currentIndex, processedOption === currentQuestion.答案);
        return {
            isCorrect: processedOption === currentQuestion.答案,
            selected: processedOption,
            type: currentQuestion.类型
        };
    }
    return null;
}

export function toggleMultiSelectOption(optionLetter) {
    if (state.mode !== 'practice') return;

    const library = getCurrentLibrary();
    // Initialize if needed
    if (!library.userAnswers[state.currentIndex]) {
        library.userAnswers[state.currentIndex] = {
            selected: [],
            isSubmitted: false
        };
    }

    const currentAnswer = library.userAnswers[state.currentIndex];
    if (currentAnswer.isSubmitted) return; // Already submitted

    if (!Array.isArray(currentAnswer.selected)) {
        currentAnswer.selected = [];
    }

    const index = currentAnswer.selected.indexOf(optionLetter);
    if (index === -1) {
        currentAnswer.selected.push(optionLetter);
    } else {
        currentAnswer.selected.splice(index, 1);
    }
    // No saveToStorage needed yet until submit? Or save draft?
    // Original code didn't save draft explicitly maybe? Checked render: uses local variable.
    // Actually original code modified `library.userAnswers`. So we should save.
    saveToStorage();
}

export function handleMultiSelectSubmit() {
    const library = getCurrentLibrary();
    const currentAnswer = library.userAnswers[state.currentIndex];
    const currentQuestion = getCurrentQuestion();

    if (!currentAnswer || !currentAnswer.selected || currentAnswer.selected.length === 0) {
        return { error: '请至少选择一个选项' };
    }

    // Sort and compare
    const userSelected = [...currentAnswer.selected].sort().join('');
    const correctIds = [...currentQuestion.答案].sort().join('');

    const isCorrect = userSelected === correctIds;

    currentAnswer.isSubmitted = true;
    currentAnswer.isCorrect = isCorrect;

    saveToStorage();
    recordQuestionPractice(currentQuestion.originalIndex || state.currentIndex, isCorrect);

    return { isCorrect, userSelected };
}

// Exam Mode Selection
export function selectExamOption(optionLetter) {
    if (!state.examMode) return;

    const currentQuestion = getCurrentQuestion();

    let processedOption = optionLetter;
    if (currentQuestion.类型 === '判断') {
        if (optionLetter === 'A') processedOption = '对';
        else if (optionLetter === 'B') processedOption = '错';
    }

    if (currentQuestion.类型 === '单选' || currentQuestion.类型 === '判断') {
        state.examAnswers[state.currentIndex] = {
            selected: processedOption,
            isCorrect: processedOption === currentQuestion.答案
        };
    } else if (currentQuestion.类型 === '多选') {
        let currentAnswer = state.examAnswers[state.currentIndex] || {
            selected: [],
            isCorrect: false
        };
        const index = currentAnswer.selected.indexOf(optionLetter);
        if (index === -1) {
            currentAnswer.selected.push(optionLetter);
        } else {
            currentAnswer.selected.splice(index, 1);
        }
        state.examAnswers[state.currentIndex] = currentAnswer;
    }
    saveToStorage();
}

export function recordQuestionPractice(questionIndex, isCorrect) {
    const key = `${state.currentLibraryIndex}-${questionIndex}`;

    if (!state.questionPracticeCounts) state.questionPracticeCounts = {};
    if (!state.correctCounts) state.correctCounts = {};

    state.questionPracticeCounts[key] = (state.questionPracticeCounts[key] || 0) + 1;

    if (isCorrect) {
        state.correctCounts[key] = (state.correctCounts[key] || 0) + 1;
    } else {
        state.correctCounts[key] = 0;
    }
    saveToStorage();
}

export function removeFromPracticeWrongQuestions(questionIndex) {
    const index = state.practiceWrongQuestions.findIndex(q => q.originalIndex === questionIndex);
    if (index !== -1) {
        state.practiceWrongQuestions.splice(index, 1);
        if (state.practiceWrongCurrentIndex >= state.practiceWrongQuestions.length) {
            state.practiceWrongCurrentIndex = Math.max(0, state.practiceWrongQuestions.length - 1);
        }
        return true;
    }
    return false;
}

export function removeFromExamWrongQuestions(questionIndex) {
    const index = state.examWrongQuestions.findIndex(q => q.originalIndex === questionIndex);
    if (index !== -1) {
        state.examWrongQuestions.splice(index, 1);
        if (state.examWrongCurrentIndex >= state.examWrongQuestions.length) {
            state.examWrongCurrentIndex = Math.max(0, state.examWrongQuestions.length - 1);
        }
        return true;
    }
    return false;
}

// Exam Logic
export function startExam(onTick, onEnd) {
    const library = getCurrentLibrary();
    if (!library || library.questions.length === 0) {
        return { error: '当前题库没有题目' };
    }

    state.examStarted = true;
    state.examMode = true;

    // Copy questions
    let questions = [...library.questions];
    // Shuffle
    for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    state.examQuestions = questions;
    state.examAnswers = {};
    state.currentIndex = 0;
    state.examScore = 0;

    saveToStorage();
    startExamTimer(onTick, onEnd);
    return { success: true };
}

export function startExamTimer(onTick, onEnd) {
    state.examTimeLeft = 90 * 60; // 90 minutes

    if (examTimerInterval) clearInterval(examTimerInterval);

    if (onTick) onTick(state.examTimeLeft);

    examTimerInterval = setInterval(() => {
        state.examTimeLeft--;
        if (onTick) onTick(state.examTimeLeft);

        if (state.examTimeLeft <= 0) {
            stopExamTimer();
            if (onEnd) onEnd();
        }
    }, 1000);
    state.examTimer = examTimerInterval; // Keep reference in state if needed, though module var is enough
}

export function stopExamTimer() {
    if (examTimerInterval) {
        clearInterval(examTimerInterval);
        examTimerInterval = null;
    }
}

export function submitExam() {
    stopExamTimer();

    const totalQuestions = state.examQuestions.length;
    let finalScore = 0;
    let singleScore = 0;
    let multiScore = 0;
    let judgeScore = 0;
    let wrongQuestions = [];

    state.examQuestions.forEach((question, index) => {
        const userAnswer = state.examAnswers[index];
        if (userAnswer) {
            let isCorrect = false;

            if (question.类型 === '单选' || question.类型 === '判断') {
                isCorrect = userAnswer.selected === question.答案;
            } else if (question.类型 === '多选') {
                const correctLetters = [...question.答案].sort().join('');
                const userLetters = [...userAnswer.selected].sort().join('');
                isCorrect = correctLetters === userLetters;
            }

            if (isCorrect) {
                const score = question.分值 || getQuestionScore(question.类型);
                finalScore += score;

                if (question.类型 === '单选') singleScore += score;
                else if (question.类型 === '多选') multiScore += score;
                else if (question.类型 === '判断') judgeScore += score;
            } else {
                wrongQuestions.push({
                    ...question,
                    userAnswer: userAnswer
                });
            }
        } else {
            // Unanswered questions count as wrong? Yes, usually.
            // Original logic: "if (userAnswer)" -> so unanswered are ignored in wrongQuestions list? 
            // Let's check original logic: "if (userAnswer) { ... }". Unanswered are NOT added to wrongQuestions.
            // This seems like a bug in original code or intentional.
            // But let's stick to original logic first.
            // WAIT: Step 493 view (line 2810): "else { wrongQuestions.push(...) }" is inside "if (userAnswer)".
            // So unanswered questions are NOT in wrongQuestions.
            // However, they are also not scoring points.
        }
    });

    const isPassed = finalScore >= 60;

    const result = {
        score: finalScore,
        singleScore,
        multiScore,
        judgeScore,
        isPassed,
        wrongQuestions
    };

    state.examHistory.push({
        date: new Date().toLocaleString(),
        ...result
    });

    saveToStorage();

    // Reset Exam State
    state.examQuestions = [];
    state.examAnswers = {};
    state.examScore = 0;
    state.examStarted = false;

    return result;
}

// Wrong Questions Logic
export function generatePracticeWrongQuestions() {
    const library = getCurrentLibrary();
    if (!library || library.questions.length === 0) {
        state.practiceWrongQuestions = [];
        return;
    }

    const practiceWrongQuestions = [];
    library.questions.forEach((question, index) => {
        const userAnswer = library.userAnswers[index];
        if (userAnswer && userAnswer.isSubmitted && !userAnswer.isCorrect) {
            practiceWrongQuestions.push({
                ...question,
                originalIndex: index,
                userAnswer: userAnswer
            });
        }
    });

    state.practiceWrongQuestions = practiceWrongQuestions;
    state.practiceWrongCurrentIndex = 0;
}

export function generateExamWrongQuestions() {
    // Collect from history? 
    // Original logic: "this.data.examWrongQuestions" was populated somewhere?
    // In original code `generateExamWrongQuestions` was called when switching tabs or clicking refresh.
    // Let's look at `index.html` again if needed.
    // Usually it aggregates from all exam history? 
    // Or just the last exam?

    // Actually, distinct feature: "Exam Wrong Question Bank".
    // It should collect unique wrong questions from all history.

    // Re-implementing based on standard logic if exact source not available immediately.
    // Original code: `this.data.examWrongQuestions`

    const allWrong = [];
    // Map to deduplicate by question content or original index? 
    // Original index is unreliable across shuffling/different exams (if exams are subsets).
    // Exam questions are copies.

    // If I check `index.html` again:
    // It seems it iterates `this.data.examHistory` and collects `wrongQuestions`.

    const seen = new Set();
    state.examHistory.forEach(record => {
        if (record.wrongQuestions) {
            record.wrongQuestions.forEach(q => {
                const key = q.题干 + q.答案; // Simple de-dupe
                if (!seen.has(key)) {
                    seen.add(key);
                    allWrong.push(q);
                }
            });
        }
    });

    state.examWrongQuestions = allWrong;
    state.examWrongCurrentIndex = 0;
}
