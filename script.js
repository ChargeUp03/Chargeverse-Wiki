var THEME_KEY = 'chargeverse-theme';

/* On phones, article sections start collapsed. Set to false to start open. */
var COLLAPSE_BY_DEFAULT = true;

/* ---------- Theme (runs immediately, no flash) ---------- */
function getSavedTheme() {
    var t = null;
    try { t = window.localStorage.getItem(THEME_KEY); } catch (e) {}
    if (!t && window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches) {
        t = 'dark';
    }
    return t;
}

function applyTheme(t) {
    if (t === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

applyTheme(getSavedTheme());

/* ---------- Spoiler mode (runs immediately, no flash) ---------- */
/* While it is "on", anything marked <span class="spoiler">...</span> is hidden
   by CSS. Click a hidden spoiler to reveal just that one. */
var SPOILER_KEY = 'chargeverse-spoilers';
var SPOILERS_DEFAULT_ON = true; /* what a first-time visitor gets. Set false to default to showing spoilers. */

function getSavedSpoilers() {
    var v = null;
    try { v = window.localStorage.getItem(SPOILER_KEY); } catch (e) {}
    if (v === 'on' || v === 'off') { return v; }
    return SPOILERS_DEFAULT_ON ? 'on' : 'off';
}

function applySpoilers(v) {
    if (v === 'on') {
        document.documentElement.setAttribute('data-spoilers', 'on');
    } else {
        document.documentElement.removeAttribute('data-spoilers');
    }
}

applySpoilers(getSavedSpoilers());

/* ---------- Helpers ---------- */
function onReady(fn) {
    if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', fn, false);
    } else if (document.attachEvent) {
        window.attachEvent('onload', fn);
    }
}

function onLoad(fn) {
    if (window.addEventListener) {
        window.addEventListener('load', fn, false);
    } else if (window.attachEvent) {
        window.attachEvent('onload', fn);
    }
}

function trim(s) {
    return s.replace(/^\s+|\s+$/g, '');
}

function hasClass(el, c) {
    return (' ' + el.className + ' ').indexOf(' ' + c + ' ') !== -1;
}

function addClass(el, c) {
    if (!hasClass(el, c)) {
        el.className = (el.className ? el.className + ' ' : '') + c;
    }
}

function removeClass(el, c) {
    el.className = trim((' ' + el.className + ' ').replace(' ' + c + ' ', ' '));
}

/* ---------- Theme toggle button ---------- */
function setupThemeToggle() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) { return; }
    btn.onclick = function () {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        var next = isDark ? 'light' : 'dark';
        applyTheme(next);
        try { window.localStorage.setItem(THEME_KEY, next); } catch (e) {}
        return false;
    };
}

/* ---------- Search (always visible) ---------- */
/* Typing + Enter or tapping the magnifier submits to search.html?q=...
   Tapping the magnifier with an empty box just focuses the box. */
function setupSearch() {
    var btn = document.getElementById('search-btn');
    var input = document.getElementById('search-input');
    var form = document.getElementById('search-form');
    if (!btn || !input || !form) { return; }

    btn.onclick = function () {
        if (trim(input.value) !== '') {
            form.submit();
        } else {
            input.focus();
        }
        return false;
    };

    form.onsubmit = function () {
        return trim(input.value) !== '';
    };
}

/* ---------- Did you know... (homepage) ---------- */
/* Reads facts.txt (one fact per line; blank lines and lines starting
   with # are ignored). Shows 3 random facts. */
function setupFacts() {
    var list = document.getElementById('facts-list');
    var btn = document.getElementById('facts-refresh');
    if (!list) { return; }

    var facts = [];

    function pickThree() {
        var copy = facts.slice(0);
        var out = [];
        while (out.length < 3 && copy.length > 0) {
            var i = Math.floor(Math.random() * copy.length);
            out.push(copy.splice(i, 1)[0]);
        }
        return out;
    }

    function render() {
        var chosen = pickThree();
        list.innerHTML = '';
        for (var i = 0; i < chosen.length; i++) {
            var li = document.createElement('li');
            li.innerHTML = chosen[i]; /* facts may contain links */
            list.appendChild(li);
        }
    }

    function showMessage(msg) {
        list.innerHTML = '';
        var li = document.createElement('li');
        li.appendChild(document.createTextNode(msg));
        list.appendChild(li);
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'facts.txt?_=' + new Date().getTime(), true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) { return; }
        var ok = (xhr.status >= 200 && xhr.status < 300) ||
                 (xhr.status === 0 && xhr.responseText);
        if (!ok) {
            showMessage('Could not load facts right now.');
            return;
        }
        var lines = xhr.responseText.split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
            var line = trim(lines[i]);
            if (line !== '' && line.charAt(0) !== '#') { facts.push(line); }
        }
        if (facts.length === 0) {
            showMessage('No facts yet. Check back soon!');
        } else {
            render();
        }
    };
    xhr.send(null);

    if (btn) {
        btn.onclick = function () {
            if (facts.length > 0) { render(); }
            return false;
        };
    }
}

/* ---------- Article: table of contents ---------- */
/* Built from the h2/h3 headings inside #article-content. Hidden on phones
   by CSS. Headings without an id get one. */
function slugify(t) {
    var s = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s === '' ? 'section' : s;
}

function setupToc() {
    var content = document.getElementById('article-content');
    var toc = document.getElementById('toc');
    var list = document.getElementById('toc-list');
    var layout = document.getElementById('article-layout');
    if (!content || !toc || !list || !layout) { return; }
    if (!content.querySelectorAll) { return; }

    var heads = content.querySelectorAll('h2, h3');
    if (heads.length < 2) { return; } /* too short to need one */

    var used = {};
    var lastLi = null;
    var sub = null;

    for (var i = 0; i < heads.length; i++) {
        var h = heads[i];
        var text = trim(h.textContent || h.innerText || '');

        if (!h.id) {
            var base = slugify(text);
            var id = base;
            var n = 2;
            while (used[id] || document.getElementById(id)) {
                id = base + '-' + n;
                n++;
            }
            h.id = id;
        }
        used[h.id] = true;

        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.appendChild(document.createTextNode(text));
        li.appendChild(a);

        if (h.tagName.toLowerCase() === 'h2' || !lastLi) {
            list.appendChild(li);
            lastLi = li;
            sub = null;
        } else {
            if (!sub) {
                sub = document.createElement('ul');
                lastLi.appendChild(sub);
            }
            sub.appendChild(li);
        }
    }

    toc.style.display = 'block';
    addClass(layout, 'has-toc');
}

/* ---------- Article: collapsible sections (phones) ---------- */
/* Every h2 in #article-content controls everything up to the next h2.
   The CSS only hides collapsed sections on narrow screens, so desktops
   always show everything. */
function setCollapsed(head, body, collapsed) {
    if (collapsed) {
        addClass(head, 'collapsed');
        addClass(body, 'collapsed');
    } else {
        removeClass(head, 'collapsed');
        removeClass(body, 'collapsed');
    }
    head.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

function makeCollapsible(head, body) {
    head._body = head._body || body;
    body._head = head;
    addClass(head, 'collapsible');
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    setCollapsed(head, body, COLLAPSE_BY_DEFAULT);

    head.onclick = function () {
        setCollapsed(head, body, !hasClass(head, 'collapsed'));
    };
    head.onkeydown = function (e) {
        e = e || window.event;
        if (e.keyCode === 13 || e.keyCode === 32) {
            setCollapsed(head, body, !hasClass(head, 'collapsed'));
            if (e.preventDefault) { e.preventDefault(); }
            return false;
        }
    };
}

function setupCollapsibles() {
    var content = document.getElementById('article-content');
    if (!content) { return; }

    var nodes = [];
    var i;
    for (i = 0; i < content.childNodes.length; i++) {
        nodes.push(content.childNodes[i]);
    }

    var head = null;
    var body = null;
    var pairs = [];

    for (i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node.nodeType === 1 && node.tagName.toLowerCase() === 'h2') {
            head = node;
            body = document.createElement('div');
            body.className = 'section-body';
            content.insertBefore(body, head.nextSibling);
            pairs.push([head, body]);
        } else if (head) {
            body.appendChild(node);
        }
    }

    for (i = 0; i < pairs.length; i++) {
        makeCollapsible(pairs[i][0], pairs[i][1]);
    }
}

/* If the page was opened at #some-heading, open the section it is in. */
function revealHash() {
    if (!window.location.hash) { return; }
    var id = window.location.hash.substring(1);
    try { id = decodeURIComponent(id); } catch (e) {}
    var target = document.getElementById(id);
    if (!target) { return; }

    if (target._body) { setCollapsed(target, target._body, false); }
    var node = target.parentNode;
    while (node && node !== document.body) {
        if (node._head) { setCollapsed(node._head, node, false); }
        node = node.parentNode;
    }
    if (target.scrollIntoView) { target.scrollIntoView(); }
}

/* ---------- Infobox: Expand / Collapse for long lists ---------- */
function setupExpandables() {
    if (!document.querySelectorAll) { return; }
    var boxes = document.querySelectorAll('.expandable');

    for (var i = 0; i < boxes.length; i++) {
        initExpandable(boxes[i]);
    }
}

function initExpandable(box) {
    var content = box.querySelector('.expandable-content');
    var btn = box.querySelector('.expand-btn');
    if (!content || !btn) { return; }

    function check() {
        if (hasClass(box, 'expanded')) { return; }
        btn.style.display = (content.scrollHeight > content.clientHeight + 2) ? 'inline-block' : 'none';
    }

    btn.onclick = function () {
        if (hasClass(box, 'expanded')) {
            removeClass(box, 'expanded');
            btn.innerHTML = 'Expand';
        } else {
            addClass(box, 'expanded');
            btn.innerHTML = 'Collapse';
        }
        return false;
    };

    check();
    onLoad(check); /* re-check once images have loaded */
}

/* ---------- Spoiler mode button ---------- */
/* Uses the #spoiler-toggle button if the page has one. If not, the script adds it
   next to the theme toggle, so older pages keep working. */
var EYE_SVG = '<svg class="icon-eye" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
var EYE_OFF_SVG = '<svg class="icon-eye-off" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>';

function updateSpoilerButton(btn) {
    var on = document.documentElement.getAttribute('data-spoilers') === 'on';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    var label = on ? 'Spoilers are hidden. Click to show them.' : 'Spoilers are showing. Click to hide them.';
    btn.setAttribute('title', label);
    btn.setAttribute('aria-label', label);
}

function setupSpoilerToggle() {
    var btn = document.getElementById('spoiler-toggle');
    if (!btn) {
        var theme = document.getElementById('theme-toggle');
        if (!theme || !theme.parentNode) { return; }
        btn = document.createElement('button');
        btn.className = 'icon-btn';
        btn.id = 'spoiler-toggle';
        btn.type = 'button';
        btn.innerHTML = EYE_SVG + EYE_OFF_SVG;
        theme.parentNode.insertBefore(btn, theme);
    }
    updateSpoilerButton(btn);

    btn.onclick = function () {
        var next = document.documentElement.getAttribute('data-spoilers') === 'on' ? 'off' : 'on';
        applySpoilers(next);
        try { window.localStorage.setItem(SPOILER_KEY, next); } catch (e) {}
        if (next === 'on' && document.querySelectorAll) {
            /* turning it back on hides everything again, including ones you clicked open */
            var shown = document.querySelectorAll('.spoiler');
            for (var i = 0; i < shown.length; i++) { removeClass(shown[i], 'revealed'); }
        }
        updateSpoilerButton(btn);
        return false;
    };
}

/* Click a hidden spoiler to reveal it; click the text again to hide it. */
function setupSpoilerReveal() {
    function handler(e) {
        e = e || window.event;
        if (document.documentElement.getAttribute('data-spoilers') !== 'on') { return; }
        var node = e.target || e.srcElement;
        var sawLink = false;
        while (node && node !== document) {
            if (node.tagName && node.tagName.toLowerCase() === 'a') { sawLink = true; }
            if (typeof node.className === 'string' && hasClass(node, 'spoiler')) {
                if (!hasClass(node, 'revealed')) {
                    addClass(node, 'revealed');
                    /* the first click only reveals; it should not follow a link */
                    if (e.preventDefault) { e.preventDefault(); } else { e.returnValue = false; }
                } else if (!sawLink) {
                    removeClass(node, 'revealed');
                }
                return;
            }
            node = node.parentNode;
        }
    }
    if (document.addEventListener) {
        document.addEventListener('click', handler, false);
    } else if (document.attachEvent) {
        document.attachEvent('onclick', handler);
    }
}

/* ---------- Back to top (in the footer box) ---------- */
/* Uses the .back-to-top link if the page has one; otherwise adds it. */
function setupBackToTop() {
    var link = null;
    var links = document.getElementsByTagName('a');
    var i;
    for (i = 0; i < links.length; i++) {
        if (hasClass(links[i], 'back-to-top')) { link = links[i]; break; }
    }

    if (!link) {
        if (document.getElementsByTagName('base').length > 0) { return; } /* 404 page: # would go to the homepage */
        var footers = document.getElementsByClassName ? document.getElementsByClassName('site-footer') : [];
        if (footers.length === 0) { return; }
        var p = document.createElement('p');
        link = document.createElement('a');
        link.className = 'back-to-top';
        link.href = '#top';
        link.appendChild(document.createTextNode('\u2191 Back to top'));
        p.appendChild(link);
        footers[0].insertBefore(p, footers[0].firstChild);
    }

    link.onclick = function () {
        window.scrollTo(0, 0);
        return false; /* keeps "#top" out of the address bar */
    };
}

onReady(function () {
    setupThemeToggle();
    setupSpoilerToggle();
    setupSpoilerReveal();
    setupBackToTop();
    setupSearch();
    setupFacts();
    setupToc();
    setupCollapsibles();
    setupExpandables();
    revealHash();
});
