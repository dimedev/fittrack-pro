// ==================== SERVICE REGISTRY ====================
// Thin wrapper replacing 245+ `typeof X === 'function'` checks
// across 22 files. Non-breaking, progressive migration.
//
// Usage:
//   Services.register('showToast', showToast);
//   Services.call('showToast', 'Hello', 'success');
//   if (Services.has('isLoggedIn')) { ... }
//
// Fallback: if not registered, checks window[name] (rétro-compat)

window.Services = {
    _registry: {},

    /**
     * Register a function by name.
     * @param {string} name
     * @param {Function} fn
     */
    register: function(name, fn) {
        if (typeof fn === 'function') {
            this._registry[name] = fn;
        }
    },

    /**
     * Register multiple functions at once.
     * @param {Object} map  { name: fn, ... }
     */
    registerAll: function(map) {
        for (var key in map) {
            if (map.hasOwnProperty(key) && typeof map[key] === 'function') {
                this._registry[key] = map[key];
            }
        }
    },

    /**
     * Call a registered (or window-global) function safely.
     * Returns undefined if function not found.
     * @param {string} name
     * @param {...*} args
     * @returns {*}
     */
    call: function(name) {
        var args = Array.prototype.slice.call(arguments, 1);
        var fn = this._registry[name];
        if (typeof fn === 'function') return fn.apply(null, args);
        // Fallback: chercher dans window (rétro-compatible)
        if (typeof window[name] === 'function') return window[name].apply(null, args);
        return undefined;
    },

    /**
     * Check if a function is available (registered or on window).
     * @param {string} name
     * @returns {boolean}
     */
    has: function(name) {
        return typeof this._registry[name] === 'function'
            || typeof window[name] === 'function';
    },

    /**
     * Get a registered function (or window global) without calling it.
     * @param {string} name
     * @returns {Function|undefined}
     */
    get: function(name) {
        var fn = this._registry[name];
        if (typeof fn === 'function') return fn;
        if (typeof window[name] === 'function') return window[name];
        return undefined;
    },

    /**
     * Debug: list all registered service names.
     * @returns {string[]}
     */
    list: function() {
        return Object.keys(this._registry);
    }
};
