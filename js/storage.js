import { state, getCurrentLibrary } from './state.js';
import { STORAGE_KEY } from './config.js';

export function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadFromStorage() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        // Merge saved data into state
        Object.assign(state, parsedData);
    }

    // Ensure defaults
    if (!state.libraries) state.libraries = [];
    if (!state.examHistory) state.examHistory = [];
    if (!state.questionOrders) {
        state.questionOrders = { single: 'sequential', multi: 'sequential', judge: 'sequential' };
    }
    // ... other defaults handled by state initialization
}

export function resetLibrary() {
    if (confirm('确定要清空所有题库并恢复到初始状态吗？此操作无法撤销。')) {
        state.libraries = [];
        state.currentLibraryId = null;
        localStorage.removeItem(STORAGE_KEY);
        alert('已清空所有题库，页面将刷新。');
        location.reload();
    }
}

export function deleteCurrentLibrary() {
    if (state.libraries.length === 0) {
        alert('没有可删除的题库');
        return;
    }

    const currentLib = getCurrentLibrary();
    if (confirm(`确定要删除题库 "${currentLib.name}" 吗？此操作无法撤销。`)) {
        state.libraries.splice(state.currentLibraryIndex, 1);

        if (state.currentLibraryIndex >= state.libraries.length) {
            state.currentLibraryIndex = Math.max(0, state.libraries.length - 1);
        }

        if (state.libraries.length === 0) {
            state.currentLibraryId = null;
            state.currentIndex = 0;
            state.mode = 'practice';
            state.isShuffled = false;
            state.practiceWrongQuestions = [];
            state.practiceWrongCurrentIndex = 0;
            state.examWrongQuestions = [];
            state.examWrongCurrentIndex = 0;
            state.examHistory = [];
        }

        saveToStorage();
        // Return true to indicate UI needs update
        return true;
    }
    return false;
}
