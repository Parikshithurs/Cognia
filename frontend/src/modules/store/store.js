/**
 * Tiny reactive state store (event emitter pattern)
 * No dependencies — just custom events
 */
class Store {
    constructor(initialState = {}) {
        this._state = { ...initialState };
        this._listeners = {};
    }

    get(key) {
        return this._state[key];
    }

    getAll() { return { ...this._state }; }

    set(key, value) {
        const prev = this._state[key];
        this._state[key] = value;
        if (prev !== value) this._emit(key, value, prev);
        return this;
    }

    update(key, updater) {
        return this.set(key, updater(this._state[key]));
    }

    on(key, listener) {
        if (!this._listeners[key]) this._listeners[key] = new Set();
        this._listeners[key].add(listener);
        return () => this._listeners[key].delete(listener); // unsubscribe fn
    }

    _emit(key, value, prev) {
        this._listeners[key]?.forEach(fn => fn(value, prev));
        this._listeners['*']?.forEach(fn => fn(key, value, prev));
    }
}

export const store = new Store({
    user: null,     // Firebase user object
    tasks: [],
    currentSession: null,
    motionData: null,     // latest camera frame data
    isDistracted: false,
    distractionCount: 0,
    loading: false,
});

export default store;
