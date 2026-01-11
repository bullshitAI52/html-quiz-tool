import { state, getCurrentLibrary } from './state.js';

let handlers = {
    onSelectOption: () => { },
    onToggleMultiSelect: () => { },
    onSubmitMultiSelect: () => { },
    onSelectExamOption: () => { },
    onPrevQuestion: () => { },
    onNextQuestion: () => { },
    onPrevPracticeWrong: () => { },
    onNextPracticeWrong: () => { },
    onPrevExamWrong: () => { },
    onNextExamWrong: () => { },
    onSwitchLibrary: () => { },
    onImportLibrary: () => { },
    onResetLibrary: () => { },
    onDeleteLibrary: () => { },
    onStartExam: () => { },
    onSubmitExam: () => { },
    onRemovePracticeWrong: () => { },
    onRemoveExamWrong: () => { },
    onReturnToPractice: () => { },
    onSwitchTab: () => { },
    onThemeToggle: () => { }
};

export function setHandlers(h) {
    handlers = { ...handlers, ...h };
}

export function showToast(message, type = 'info') {
    // Current app uses alert for most things, but we can add a toast if we want.
    // For now, replacing alerts with alerts is fine, or implementing a simple toast.
    alert(message);
}

export function updateUI() {
    updateThemeButton();
    const library = getCurrentLibrary();

    // library list
    renderLibraryList();

    // No library case
    if (!library && state.libraries.length === 0) {
        document.getElementById('question-container').classList.add('hidden');
        document.getElementById('empty-state').classList.remove('hidden');
        document.getElementById('library-info').textContent = '请导入题库开始练习';
        return;
    }

    document.getElementById('question-container').classList.remove('hidden');
    document.getElementById('empty-state').classList.add('hidden');

    if (library) {
        document.getElementById('library-info').textContent =
            `当前题库: ${library.name} (共${library.questions.length}题)`;

        // Update stats
        updateStatsDisplay();
    }

    // Tabs visibility
    // Tabs visibility
    document.getElementById('practice-tab').classList.toggle('hidden', state.currentTab !== 'practice');
    document.getElementById('exam-tab').classList.toggle('hidden', state.currentTab !== 'exam');
    document.getElementById('practice-wrong-tab').classList.toggle('hidden', state.currentTab !== 'practice-wrong');
    document.getElementById('exam-wrong-tab').classList.toggle('hidden', state.currentTab !== 'exam-wrong');
    document.getElementById('exam-stats-tab').classList.toggle('hidden', state.currentTab !== 'exam-stats');

    // Tab active state
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === state.currentTab);
    });

    if (state.currentTab === 'practice') {
        renderQuestion();
        updatePracticeQuestionNumberStyles();
    } else if (state.currentTab === 'exam') {
        if (state.examStarted) {
            document.getElementById('exam-start-container').classList.add('hidden');
            document.getElementById('exam-layout').classList.remove('hidden');
            renderQuestion();
            updateExamQuestionNumberStyles();
        } else {
            document.getElementById('exam-start-container').classList.remove('hidden');
            document.getElementById('exam-layout').classList.add('hidden');
            // updateExamStats? No, stats is separate tab now.
        }
    } else if (state.currentTab === 'practice-wrong') {
        updatePracticeWrongUI();
    } else if (state.currentTab === 'exam-wrong') {
        updateExamWrongUI();
    } else if (state.currentTab === 'exam-stats') {
        renderExamHistory();
    }
}

export function renderLibraryList() {
    const list = document.getElementById('library-list');
    list.innerHTML = '';

    state.libraries.forEach((lib, index) => {
        const item = document.createElement('div');
        item.className = `library-item ${index === state.currentLibraryIndex ? 'active' : ''}`;
        item.innerHTML = `
            <div class="library-name">${lib.name}</div>
            <div class="library-count">${lib.questions.length}题</div>
        `;
        item.onclick = () => handlers.onSwitchLibrary(index);
        list.appendChild(item);
    });
}

export function renderQuestion() {
    let question;
    let modeClass = '';

    if (state.mode === 'practice') {
        question = getCurrentLibrary().questions[state.currentIndex];
    } else if (state.mode === 'exam') {
        question = state.examQuestions[state.currentIndex];
        modeClass = 'exam-mode';
    }

    if (!question) return;

    // Update Question Text
    const questionText = state.mode === 'exam' ?
        document.getElementById('exam-question') :
        document.getElementById('question');

    if (questionText) {
        questionText.className = `question-text ${modeClass}`;

        // Add type badge
        let typeBadge = '';
        if (question.类型 === '单选') typeBadge = '<span class="badge badge-blue">单选</span>';
        else if (question.类型 === '多选') typeBadge = '<span class="badge badge-green">多选</span>';
        else if (question.类型 === '判断') typeBadge = '<span class="badge badge-yellow">判断</span>';

        questionText.innerHTML = `${typeBadge} ${state.currentIndex + 1}. ${question.题干}`;
    }

    // Options
    const optionsContainer = state.mode === 'exam' ?
        document.getElementById('exam-options') :
        document.getElementById('options');

    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';

    const isMultiSelect = question.类型 === '多选';
    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    if (question.类型 === '判断') {
        // Render Judge Options
        const optionTrue = createOption('A', '对', state.mode);
        const optionFalse = createOption('B', '错', state.mode);

        optionsContainer.appendChild(optionTrue);
        optionsContainer.appendChild(optionFalse);
    } else {
        optionLetters.forEach(letter => {
            const key = `选项${letter}`;
            if (question[key]) {
                const option = createOption(letter, question[key], state.mode);
                optionsContainer.appendChild(option);
            }
        });
    }

    // Submit button for practice multi-select
    if (isMultiSelect && state.mode === 'practice' && !state.examMode) {
        const submitBtn = document.createElement('button');
        submitBtn.className = 'button button-success';
        submitBtn.textContent = '提交答案';
        submitBtn.onclick = handlers.onSubmitMultiSelect;
        optionsContainer.appendChild(submitBtn);
    }

    updateOptionStyles();
    renderAnswerAndExplanation();
}

function createOption(letter, text, mode) {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.innerHTML = `
        <span class="option-letter">${letter}</span>
        <span class="option-text">${text}</span>
    `;

    if (mode === 'exam') {
        btn.onclick = () => handlers.onSelectExamOption(letter);
    } else if (state.mode === 'practice') {
        const question = getCurrentLibrary().questions[state.currentIndex];
        if (question.类型 === '多选') {
            btn.onclick = () => handlers.onToggleMultiSelect(letter);
        } else {
            btn.onclick = () => handlers.onSelectOption(letter);
        }
    }
    return btn;
}

export function updateOptionStyles() {
    const isExam = state.mode === 'exam';
    const container = isExam ? document.getElementById('exam-options') : document.getElementById('options');
    if (!container) return;

    const options = container.querySelectorAll('.option');
    const question = isExam ? state.examQuestions[state.currentIndex] : getCurrentLibrary().questions[state.currentIndex];

    if (!question) return;

    options.forEach(option => {
        const letter = option.querySelector('.option-letter').textContent;
        option.className = 'option'; // reset

        if (state.mode === 'exam') {
            const answer = state.examAnswers[state.currentIndex];
            if (answer) {
                if (question.类型 === '多选') {
                    if (answer.selected.includes(letter)) option.classList.add('selected');
                } else {
                    if (answer.selected === letter) option.classList.add('selected');
                }
                // If judge, map letter A/B to 对/错 handled in createOption? 
                // Wait, createOption sets letter A/B. The answer stores 对/错.
                // Need to handle mapping for style check.
                let checkVal = letter;
                if (question.类型 === '判断') {
                    checkVal = (letter === 'A') ? '对' : '错';
                }

                if (question.类型 === '多选') {
                    // Exam multi select stores letters usually? 
                    // Logic.js says: stores letters.
                    if (answer.selected.includes(letter)) option.classList.add('selected');
                } else {
                    if (answer.selected === checkVal) option.classList.add('selected');
                }
            }
        } else if (state.mode === 'practice') {
            const lib = getCurrentLibrary();
            const answer = lib.userAnswers[state.currentIndex];

            // Temporary multi-select state
            if (question.类型 === '多选' && !answer?.isSubmitted) {
                // Check handlers? Logic.js should store temp state?
                // Logic.js `toggleMultiSelectOption` updates `library.userAnswers` directly even before submit.
                // So we check `answer.selected`.
                if (answer && answer.selected.includes(letter)) {
                    option.classList.add('selected');
                }
            }

            if (answer && answer.isSubmitted) {
                let val = letter;
                if (question.类型 === '判断') val = (letter === 'A') ? '对' : '错';

                // Correct logic
                if (question.类型 === '多选') {
                    if (question.答案.includes(letter)) option.classList.add('correct-answer');
                    if (answer.selected.includes(letter) && !question.答案.includes(letter)) option.classList.add('wrong-answer');
                } else {
                    if (val === question.答案) option.classList.add('correct-answer');
                    if (answer.selected === val && val !== question.答案) option.classList.add('wrong-answer');
                }
            }
        }
    });
}

export function renderAnswerAndExplanation() {
    if (state.mode === 'exam') return; // Don't show in exam

    const question = getCurrentLibrary().questions[state.currentIndex];
    const answer = getCurrentLibrary().userAnswers[state.currentIndex];

    const container = document.getElementById('answer-container');
    const explContainer = document.getElementById('explanation-container');

    // Show if submitted or 'back' mode (if we implemented back mode, but removing/sticking to practice for now)
    // Logic: Show if answered.
    const show = answer && answer.isSubmitted;

    if (show) {
        container.classList.remove('hidden');
        explContainer.classList.remove('hidden');
        document.getElementById('correct-answer').textContent = question.答案;
        document.getElementById('explanation').textContent = question.解析 || '暂无解析';
    } else {
        container.classList.add('hidden');
        explContainer.classList.add('hidden');
    }
}

export function updateStatsDisplay() {
    const library = getCurrentLibrary();
    if (!library) return;

    let correct = 0;
    let answered = 0;
    Object.values(library.userAnswers).forEach(a => {
        if (a.isSubmitted) {
            answered++;
            if (a.isCorrect) correct++;
        }
    });

    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    document.getElementById('stats-total').textContent = library.questions.length;
    document.getElementById('stats-answered').textContent = answered;
    document.getElementById('stats-accuracy').textContent = accuracy + '%';

    // Update progress bar
    const percent = library.questions.length ? (answered / library.questions.length) * 100 : 0;
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('progress-text').textContent = `${answered}/${library.questions.length}`;
}

export function updatePracticeQuestionNumberStyles() {
    // This requires generating the sidebar numbers.
    // Ideally we generate them once or only update classes.
    // For now, let's regenerate or just update if exists.
    // Since we split files, maybe we render sidebar in a separate function.
    renderPracticeSidebar();
}

function renderPracticeSidebar() {
    const library = getCurrentLibrary();
    if (!library) return;

    // Check if we need to full render or just update classes. 
    // Simplified: Full render for now, optimization later.
    ['single', 'multi', 'judge'].forEach(type => {
        const container = document.getElementById(`${type}-grid`); // IDs: practice-single-grid etc?
        // Checking index.html IDs: 'single-grid', 'multi-grid', 'judge-grid' for Practice tab.
        // Wait, index.html might have specific IDs.
        // Let's assume standard names or check `index.html` later.
        // Using `single-grid` etc based on previous knowledge.
        if (container) {
            container.innerHTML = '';
            // Filter questions by type to generate numbers... 
            // Logic in index.html was: it looped all questions, but put them in buckets.
            // Actually index.html logic: 
            // `singleQuestions` array...
            // We need to bucket them out of `library.questions`.
        }
    });

    // Actually, simply iterating all questions and appending to respective container is easier.
    const sGrid = document.getElementById('practice-single-grid');
    const mGrid = document.getElementById('practice-multi-grid');
    const jGrid = document.getElementById('practice-judge-grid');

    if (sGrid) sGrid.innerHTML = '';
    if (mGrid) mGrid.innerHTML = '';
    if (jGrid) jGrid.innerHTML = '';

    let sCount = 0, mCount = 0, jCount = 0;

    library.questions.forEach((q, index) => {
        let btn = document.createElement('div');
        btn.className = 'question-number';

        // Status classes
        if (index === state.currentIndex) btn.classList.add('current');
        const ans = library.userAnswers[index];
        if (ans && ans.isSubmitted) {
            btn.classList.add('answered');
            if (!ans.isCorrect) btn.classList.add('wrong');
        }

        btn.onclick = () => {
            state.currentIndex = index; // Logic change?
            // Should call handler? 
            // handlers.onJumpToQuestion(index);
            state.currentIndex = index; // Direct state change for nav is ok?
            updateUI();
        };

        if (q.类型 === '单选') {
            sCount++;
            btn.textContent = sCount;
            sGrid?.appendChild(btn);
        } else if (q.类型 === '多选') {
            mCount++;
            btn.textContent = mCount;
            mGrid?.appendChild(btn);
        } else if (q.类型 === '判断') {
            jCount++;
            btn.textContent = jCount;
            jGrid?.appendChild(btn);
        }
    });
}

export function renderExamHistory() {
    const list = document.getElementById('exam-history-list');
    if (!list) return;
    list.innerHTML = '';

    if (state.examHistory.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center">暂无考试记录</p>';
        return;
    }

    [...state.examHistory].reverse().forEach((h, i) => {
        const item = document.createElement('div');
        item.className = 'history-item card'; // styling
        item.innerHTML = `
              <div>考试 ${state.examHistory.length - i} - ${h.date}</div>
              <div>得分: ${h.score} - ${h.isPassed ? '通过' : '未通过'}</div>
          `;
        list.appendChild(item);
    });
}

export function updateThemeButton() {
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.textContent = state.isDarkMode ? '☀️' : '🌙';
    }
    document.documentElement.classList.toggle('dark-mode', state.isDarkMode);
}

// ... Additional methods for Wrong Question UI ...
export function updatePracticeWrongUI() {
    const question = state.practiceWrongQuestions[state.practiceWrongCurrentIndex];
    const container = document.getElementById('practice-wrong-question');
    const optionsContainer = document.getElementById('practice-wrong-options'); // specific ID

    if (!question) {
        if (container) container.innerHTML = '暂无错题';
        if (optionsContainer) optionsContainer.innerHTML = '';
        updatePracticeWrongSidebar();
        return;
    }

    // Render Question Text
    let modeClass = 'wrong-mode';
    let typeBadge = '';
    if (question.类型 === '单选') typeBadge = '<span class="badge badge-blue">单选</span>';
    else if (question.类型 === '多选') typeBadge = '<span class="badge badge-green">多选</span>';
    else if (question.类型 === '判断') typeBadge = '<span class="badge badge-yellow">判断</span>';

    container.innerHTML = `${typeBadge} ${state.practiceWrongCurrentIndex + 1}. ${question.题干}`;

    // Render Options
    optionsContainer.innerHTML = '';
    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    if (question.类型 === '判断') {
        const optionTrue = createWrongOption('A', '对', 'practiceWrong', question);
        const optionFalse = createWrongOption('B', '错', 'practiceWrong', question);
        optionsContainer.appendChild(optionTrue);
        optionsContainer.appendChild(optionFalse);
    } else {
        optionLetters.forEach(letter => {
            const key = `选项${letter}`;
            if (question[key]) {
                const option = createWrongOption(letter, question[key], 'practiceWrong', question);
                optionsContainer.appendChild(option);
            }
        });
    }

    // Render Explanation
    const expl = document.getElementById('practice-wrong-explanation');
    if (expl) {
        expl.innerHTML = `
            <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <strong>正确答案：</strong>${question.答案}<br>
                <strong>解析：</strong>${question.解析 || '暂无解析'}
                <button class="button button-sm button-danger" style="margin-top: 10px;" id="remove-practice-wrong-btn">移除此题</button>
            </div>
        `;
        document.getElementById('remove-practice-wrong-btn').onclick = handlers.onRemovePracticeWrong;
    }

    updatePracticeWrongSidebar();
}

export function updateExamWrongUI() {
    const question = state.examWrongQuestions[state.examWrongCurrentIndex];
    const container = document.getElementById('exam-wrong-question');
    const optionsContainer = document.getElementById('exam-wrong-options');

    if (!question) {
        if (container) container.innerHTML = '暂无错题';
        if (optionsContainer) optionsContainer.innerHTML = '';
        updateExamWrongSidebar();
        return;
    }

    let typeBadge = '';
    if (question.类型 === '单选') typeBadge = '<span class="badge badge-blue">单选</span>';
    else if (question.类型 === '多选') typeBadge = '<span class="badge badge-green">多选</span>';
    else if (question.类型 === '判断') typeBadge = '<span class="badge badge-yellow">判断</span>';

    container.innerHTML = `${typeBadge} ${state.examWrongCurrentIndex + 1}. ${question.题干}`;

    optionsContainer.innerHTML = '';
    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    if (question.类型 === '判断') {
        optionsContainer.appendChild(createWrongOption('A', '对', 'examWrong', question));
        optionsContainer.appendChild(createWrongOption('B', '错', 'examWrong', question));
    } else {
        optionLetters.forEach(letter => {
            const key = `选项${letter}`;
            if (question[key]) {
                optionsContainer.appendChild(createWrongOption(letter, question[key], 'examWrong', question));
            }
        });
    }

    const expl = document.getElementById('exam-wrong-explanation');
    if (expl) {
        expl.innerHTML = `
            <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <strong>正确答案：</strong>${question.答案}<br>
                <strong>解析：</strong>${question.解析 || '暂无解析'}
                <button class="button button-sm button-danger" style="margin-top: 10px;" id="remove-exam-wrong-btn">移除此题</button>
            </div>
        `;
        document.getElementById('remove-exam-wrong-btn').onclick = handlers.onRemoveExamWrong;
    }

    updateExamWrongSidebar();
}

function createWrongOption(letter, text, listType, question) {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.innerHTML = `
        <span class="option-letter">${letter}</span>
        <span class="option-text">${text}</span>
    `;

    // Highlight correct/wrong immediately for wrong review mode
    // (Assuming we always show answer in wrong review)
    let val = letter;
    if (question.类型 === '判断') val = (letter === 'A') ? '对' : '错';

    if (question.类型 === '多选') {
        if (question.答案.includes(letter)) btn.classList.add('correct-answer');
    } else {
        if (val === question.答案) btn.classList.add('correct-answer');
    }

    // Also highlight user's wrong answer if available in `question.userAnswer`
    const userAnswer = question.userAnswer;
    if (userAnswer) {
        let userSelected = userAnswer.selected; // 'A' or 'AB' or '对'
        // Handle multiselect format matching
        if (question.类型 === '多选') {
            if (userSelected.includes(letter) && !question.答案.includes(letter)) {
                btn.classList.add('wrong-answer');
            }
        } else {
            if (userSelected === val && val !== question.答案) {
                btn.classList.add('wrong-answer');
            }
        }
    }

    return btn;
}


function updatePracticeWrongSidebar() {
    const questions = state.practiceWrongQuestions;
    renderWrongSidebarGrid('practice', questions);
    // Highlight current
    // ...
}

function updateExamWrongSidebar() {
    const questions = state.examWrongQuestions;
    renderWrongSidebarGrid('exam', questions);
}

function renderWrongSidebarGrid(prefix, questions) {
    // prefix: 'practice' or 'exam'
    // grids: prefix-wrong-single-grid etc.
    const sGrid = document.getElementById(`${prefix}-wrong-single-grid`);
    const mGrid = document.getElementById(`${prefix}-wrong-multi-grid`);
    const jGrid = document.getElementById(`${prefix}-wrong-judge-grid`);

    if (sGrid) sGrid.innerHTML = '';
    if (mGrid) mGrid.innerHTML = '';
    if (jGrid) jGrid.innerHTML = '';

    let sCount = 0, mCount = 0, jCount = 0;

    questions.forEach((q, index) => {
        const btn = document.createElement('div');
        btn.className = 'question-number';
        // Highlight current
        const currentIndex = prefix === 'practice' ? state.practiceWrongCurrentIndex : state.examWrongCurrentIndex;
        if (index === currentIndex) btn.classList.add('current');

        btn.onclick = () => {
            if (prefix === 'practice') {
                state.practiceWrongCurrentIndex = index;
                updatePracticeWrongUI();
            } else {
                state.examWrongCurrentIndex = index;
                updateExamWrongUI();
            }
        };

        if (q.类型 === '单选') {
            sCount++;
            btn.textContent = sCount;
            sGrid?.appendChild(btn);
        } else if (q.类型 === '多选') {
            mCount++;
            btn.textContent = mCount;
            mGrid?.appendChild(btn);
        } else if (q.类型 === '判断') {
            jCount++;
            btn.textContent = jCount;
            jGrid?.appendChild(btn);
        }
    });
}

export function updateExamQuestionNumberStyles() {
    const container = document.getElementById('exam-sidebar');
    if (!container) return;

    // Check if we assume sidebar exists or generate it?
    // Exam sidebar is usually a single list or grid?
    // Index.html: `exam-single-grid`, `exam-multi-grid`, `exam-judge-grid`.

    // We need to render them first if empty?
    // Let's implement full render for safety.

    const sGrid = document.getElementById('single-choice-grid');
    const mGrid = document.getElementById('multi-choice-grid');
    const jGrid = document.getElementById('judge-grid');

    if (sGrid && sGrid.innerHTML === '') { // Only generate if empty? 
        // No, we should probably regenerate or check.
        // Simplified: regenerate.
    }

    if (sGrid) sGrid.innerHTML = '';
    if (mGrid) mGrid.innerHTML = '';
    if (jGrid) jGrid.innerHTML = '';

    let sCount = 0, mCount = 0, jCount = 0;

    state.examQuestions.forEach((q, index) => {
        const btn = document.createElement('div');
        btn.className = 'question-number';
        if (index === state.currentIndex) btn.classList.add('current');

        // Answered state
        if (state.examAnswers[index]) btn.classList.add('answered');

        btn.onclick = () => {
            state.currentIndex = index;
            updateUI();
        };

        if (q.类型 === '单选') {
            sCount++;
            btn.textContent = sCount;
            sGrid?.appendChild(btn);
        } else if (q.类型 === '多选') {
            mCount++;
            btn.textContent = mCount;
            mGrid?.appendChild(btn);
        } else if (q.类型 === '判断') {
            jCount++;
            btn.textContent = jCount;
            jGrid?.appendChild(btn);
        }
    });
}

export function updateExamTimerDisplay(timeLeft) {
    if (timeLeft === undefined) timeLeft = state.examTimeLeft;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const el = document.getElementById('exam-timer');
    if (el) {
        el.textContent = `剩余时间: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

export function updateFontSizes() {
    document.documentElement.style.setProperty('--question-font-size', `${state.questionFontSize}px`);
    document.documentElement.style.setProperty('--option-font-size', `${state.optionFontSize}px`);
    const display = document.getElementById('font-size-display');
    if (display) display.textContent = `${state.questionFontSize}px`;
}
