// ============================================================================
// REPZY — DOM-SAFE HELPERS
// ----------------------------------------------------------------------------
// V6.1 STORE-BLOCKER : sanitization XSS pour tous les `innerHTML` qui injectent
// du contenu user-input (noms d'aliments custom, noms d'exos, notes, etc.).
//
// Le repo a ~190 occurrences de `innerHTML = ...${var}...`. Beaucoup de ces
// vars sont system-generated (dates, IDs, valeurs numériques) — pas un risque.
// Mais une partie injecte du texte que l'user a typé librement → si on
// n'escape pas, un nom d'aliment comme `<img src=x onerror=alert(1)>` exécute
// du JS arbitraire. Bloquant Play Store + risque sécu.
//
// USAGE :
//   const safe = window.DomSafe.escape(food.name);  // → string HTML-safe
//   element.textContent = food.name;                 // ← préférable (pas d'HTML)
//   element.innerHTML = `<span>${DomSafe.escape(food.name)}</span>`;
//
// Pour les attributs HTML (ex: title, alt, data-*) :
//   element.setAttribute('title', food.name);       // ← API native = safe
//   `<div title="${DomSafe.attr(food.name)}">`      // ← si concat HTML
//
// Pour les valeurs JS dans des onclick inline (anti-pattern à éviter) :
//   `<button onclick="fn('${DomSafe.jsString(name)}')">`
// ============================================================================

(function() {
    'use strict';

    /**
     * Échappe les 5 caractères dangereux en HTML.
     * Pattern recommandé OWASP : &, <, >, ", '
     * Le `/` n'est pas strictement nécessaire mais on l'ajoute pour défendre
     * contre les contextes <script> mal isolés.
     *
     * @param {string|number|null|undefined} str
     * @returns {string}
     */
    function escape(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Échappe pour utilisation dans un attribut HTML (alt, title, data-*, ...).
     * Strictement équivalent à `escape()` mais nommé pour clarifier l'intention.
     */
    function attr(str) {
        return escape(str);
    }

    /**
     * Échappe pour utilisation comme string littéral dans du JS inline
     * (onclick="fn('${...}')"). Anti-pattern à éviter, mais quand on est forcé.
     * On échappe les guillemets, le backslash et les line terminators.
     */
    function jsString(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/</g, '\\x3C');
    }

    /**
     * Définit le texte d'un élément en safe (pas de parsing HTML).
     * Préféré à innerHTML pour du contenu purement textuel.
     */
    function setText(el, text) {
        if (!el) return;
        el.textContent = (text === null || text === undefined) ? '' : String(text);
    }

    /**
     * Crée un élément avec attributs et children safe. Évite innerHTML.
     *
     * @example
     *   DomSafe.el('span', { class: 'food-name', title: name }, name)
     *   // → <span class="food-name" title="<escaped name>"><escaped name></span>
     *
     * @param {string} tag
     * @param {Object} [attrs]
     * @param {string|Node|Array<string|Node>} [children]
     * @returns {HTMLElement}
     */
    function el(tag, attrs, children) {
        const node = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(k => {
                const v = attrs[k];
                if (v === null || v === undefined || v === false) return;
                if (k === 'class' || k === 'className') node.className = String(v);
                else if (k === 'style' && typeof v === 'object') {
                    Object.assign(node.style, v);
                } else if (k.startsWith('on') && typeof v === 'function') {
                    node.addEventListener(k.slice(2).toLowerCase(), v);
                } else {
                    node.setAttribute(k, String(v));
                }
            });
        }
        if (children !== undefined && children !== null) {
            const arr = Array.isArray(children) ? children : [children];
            arr.forEach(c => {
                if (c === null || c === undefined) return;
                if (c instanceof Node) node.appendChild(c);
                else node.appendChild(document.createTextNode(String(c)));
            });
        }
        return node;
    }

    // ── Export ─────────────────────────────────────────────────────────────
    const DomSafe = {
        escape: escape,
        attr: attr,
        jsString: jsString,
        setText: setText,
        el: el,
    };

    window.DomSafe = DomSafe;

    // Alias court fréquemment utilisé
    window.escapeHtml = escape;
})();
