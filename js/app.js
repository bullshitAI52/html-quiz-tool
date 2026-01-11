import { state } from './state.js';
import * as Logic from './logic.js';
import * as UI from './ui.js';
import * as Storage from './storage.js';

// Debug check
console.log('App.js loaded');

window.quizApp = {
    init() {
        Storage.loadFromStorage();
        this.bindHandlers();
        this.setupEventListeners();

        UI.updateFontSizes();
        UI.updateThemeButton(); // Ensure button matches state
        UI.updateUI();
    },

    bindHandlers() {
        UI.setHandlers({
            onSelectOption: (letter) => {
                const res = Logic.selectOption(letter);
                if (res) {
                    UI.updateOptionStyles();
                    UI.renderAnswerAndExplanation(); // Show answer immediately
                    UI.updatePracticeQuestionNumberStyles();

                    // Show immediate feedback
                    const resultDiv = document.getElementById('answer-result');
                    if (resultDiv) {
                        if (res.isCorrect) {
                            resultDiv.textContent = '回答正确';
                            resultDiv.style.color = 'var(--correct-color)';
                        } else {
                            resultDiv.textContent = '回答错误';
                            resultDiv.style.color = 'var(--wrong-color)';
                        }
                    }
                    UI.updateStatsDisplay();
                }
            },
            onToggleMultiSelect: (letter) => {
                Logic.toggleMultiSelectOption(letter);
                UI.updateOptionStyles();
            },
            onSubmitMultiSelect: () => {
                const res = Logic.handleMultiSelectSubmit();
                if (res.error) {
                    alert(res.error);
                } else {
                    UI.updateOptionStyles();
                    UI.renderAnswerAndExplanation();
                    UI.updatePracticeQuestionNumberStyles();

                    const resultDiv = document.getElementById('answer-result');
                    if (resultDiv) {
                        if (res.isCorrect) {
                            resultDiv.textContent = '回答正确';
                            resultDiv.style.color = 'var(--correct-color)';
                        } else {
                            resultDiv.textContent = '回答错误';
                            // Show user selection?
                            // Original showed: "你的答案: ABC"
                            resultDiv.textContent = `回答错误 (你的答案: ${res.userSelected})`;
                            resultDiv.style.color = 'var(--wrong-color)';
                        }
                    }
                    UI.updateStatsDisplay();
                }
            },
            onSelectExamOption: (letter) => {
                Logic.selectExamOption(letter);
                UI.updateOptionStyles();
                UI.updateExamQuestionNumberStyles(); // Update sidebar answered state
            },
            onSwitchLibrary: (index) => {
                if (Logic.switchLibrary(index)) {
                    UI.updateUI();
                }
            },
            onRemovePracticeWrong: () => {
                if (Logic.removeFromPracticeWrongQuestions(state.practiceWrongQuestions[state.practiceWrongCurrentIndex].originalIndex)) {
                    UI.updatePracticeWrongUI();
                }
            },
            onRemoveExamWrong: () => {
                if (Logic.removeFromExamWrongQuestions(state.examWrongQuestions[state.examWrongCurrentIndex].originalIndex)) {
                    UI.updateExamWrongUI();
                }
            }
        });
    },

    setupEventListeners() {
        // Navigation
        document.getElementById('prevButton')?.addEventListener('click', () => {
            if (Logic.prevQuestion()) UI.updateUI();
            else alert('已经是第一题了');
        });
        document.getElementById('nextButton')?.addEventListener('click', () => {
            if (Logic.nextQuestion()) UI.updateUI();
            else {
                if (state.examMode) alert('已到达最后一题，请提交考试');
                else alert('已经是最后一题了');
            }
        });

        // Exam Navigation
        document.getElementById('exam-prevButton')?.addEventListener('click', () => {
            if (Logic.prevQuestion()) UI.updateUI();
            else alert('已经是第一题了');
        });
        document.getElementById('exam-nextButton')?.addEventListener('click', () => {
            if (Logic.nextQuestion()) UI.updateUI();
            else alert('已到达最后一题，请提交考试');
        });

        // Settings
        document.getElementById('decrease-font')?.addEventListener('click', () => {
            if (state.questionFontSize > 12) {
                state.questionFontSize -= 2;
                state.optionFontSize -= 2;
                Storage.saveToStorage();
                UI.updateFontSizes();
            }
        });

        document.getElementById('increase-font')?.addEventListener('click', () => {
            if (state.questionFontSize < 30) {
                state.questionFontSize += 2;
                state.optionFontSize += 2;
                Storage.saveToStorage();
                UI.updateFontSizes();
            }
        });

        document.getElementById('themeToggle')?.addEventListener('click', () => {
            state.isDarkMode = !state.isDarkMode;
            Storage.saveToStorage();
            UI.updateThemeButton();
        });

        document.getElementById('resetLibraryButton')?.addEventListener('click', () => {
            Storage.resetLibrary();
        });

        document.getElementById('deleteLibraryButton')?.addEventListener('click', () => {
            if (Storage.deleteCurrentLibrary()) {
                UI.updateUI();
            }
        });

        // Mode Toggles
        document.getElementById('modeButton')?.addEventListener('click', () => {
            state.mode = state.mode === 'practice' ? 'back' : 'practice';
            Storage.saveToStorage();
            UI.updateUI();
        });

        document.getElementById('practice-wrong-modeButton')?.addEventListener('click', () => {
            state.practiceWrongMode = state.practiceWrongMode === 'practice' ? 'back' : 'practice';
            UI.updatePracticeWrongUI();
        });

        document.getElementById('exam-wrong-modeButton')?.addEventListener('click', () => {
            state.examWrongMode = state.examWrongMode === 'practice' ? 'back' : 'practice';
            UI.updateExamWrongUI();
        });

        // Import
        document.getElementById('importButton')?.addEventListener('click', () => {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.click();
            else alert('Error: File input element not found!');
        });

        document.getElementById('fileInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!window.XLSX) {
                alert('Error: XLSX library not loaded. Please check your internet connection.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = window.XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    // Create Library logic
                    const newLibrary = {
                        name: file.name.replace(/\.[^/.]+$/, ""),
                        questions: jsonData.map(row => ({
                            题干: row[0] || '',
                            答案: (row[1] || '').toString().trim().toUpperCase().replace(/[^A-Z对错]/g, ''),
                            类型: Logic.determineQuestionType(row[1]),
                            选项A: row[2] || '',
                            选项B: row[3] || '',
                            选项C: row[4] || '',
                            选项D: row[5] || '',
                            选项E: row[6] || '',
                            选项F: row[7] || '',
                            选项G: row[8] || '',
                            选项H: row[9] || '',
                            解析: row[10] || '',
                            难度: row[11] || '中等',
                            分类: row[12] || '未分类',
                            分值: Logic.getQuestionScore(Logic.determineQuestionType(row[1]))
                        })).filter(q => q.题干),
                        userAnswers: {},
                        originalOrder: []
                    };

                    if (newLibrary.questions.length === 0) {
                        alert('Error: No valid questions found in the Excel file.');
                        return;
                    }

                    state.libraries.push(newLibrary);
                    state.currentLibraryIndex = state.libraries.length - 1;
                    state.currentIndex = 0;
                    Storage.saveToStorage();
                    UI.updateUI();
                    alert(`成功导入 ${newLibrary.questions.length} 道题目`);
                } catch (error) {
                    alert('导入失败: ' + error.message);
                    console.error(error);
                }
            };
            reader.onerror = (err) => {
                alert('Error reading file');
            };
            reader.readAsArrayBuffer(file);
        });

        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                state.currentTab = tabName;

                // Logic based on tab
                if (tabName === 'exam' && !state.examStarted) {
                    UI.renderExamHistory();
                } else if (tabName === 'practice-wrong') {
                    Logic.generatePracticeWrongQuestions();
                } else if (tabName === 'exam-wrong') {
                    Logic.generateExamWrongQuestions();
                } else if (tabName === 'exam-stats') {
                    UI.renderExamHistory();
                }

                Storage.saveToStorage();
                UI.updateUI();
            });
        });

        // Exam Buttons
        document.getElementById('start-exam')?.addEventListener('click', () => {
            const res = Logic.startExam(
                (timeLeft) => UI.updateExamTimerDisplay(timeLeft),
                () => {
                    alert('考试时间到，自动提交');
                    const result = Logic.submitExam();
                    // Show result? logic.submitExam returns result
                    // Logic handles history push.
                    UI.updateUI(); // Switch back to practice or show result modal?
                    // Original behavior: alert + switch to practice.
                }
            );
            if (res.error) alert(res.error);
            else UI.updateUI();
        });

        document.getElementById('submit-exam')?.addEventListener('click', () => {
            // Logic.submitExam asks for confirmation? 
            // Original logic had confirmation inside submitExam?
            // No, original had logic inside submitExam to check unanswered count.
            // We moved that logic to logic.js? 
            // Logic.js `submitExam` calls `stopExamTimer`.

            // We should check unanswered here before calling logic?
            // Or logic.submitExam should return incomplete warning?

            // Let's implement confirmation here.
            const total = state.examQuestions.length;
            const answered = Object.keys(state.examAnswers).length;
            if (answered < total) {
                if (!confirm(`还有 ${total - answered} 题未做，确定提交吗？`)) return;
            }

            const result = Logic.submitExam();
            // Original code alert result.
            // Logic.js returns result object.
            alert(`考试结束！\n得分: ${result.score}\n${result.isPassed ? '通过' : '未通过'}`);
            UI.updateUI();
        });

        // Wrong Question Navigation
        document.getElementById('practice-wrong-prevButton')?.addEventListener('click', () => {
            if (Logic.prevPracticeWrongQuestion()) UI.updatePracticeWrongUI();
            else alert('已经是第一题了');
        });
        document.getElementById('practice-wrong-nextButton')?.addEventListener('click', () => {
            if (Logic.nextPracticeWrongQuestion()) UI.updatePracticeWrongUI();
            else alert('已经是最后一题了');
        });

        document.getElementById('exam-wrong-prevButton')?.addEventListener('click', () => {
            if (Logic.prevExamWrongQuestion()) UI.updateExamWrongUI();
            else alert('已经是第一题了');
        });
        document.getElementById('exam-wrong-nextButton')?.addEventListener('click', () => {
            if (Logic.nextExamWrongQuestion()) UI.updateExamWrongUI();
            else alert('已经是最后一题了');
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.quizApp.init();
});
