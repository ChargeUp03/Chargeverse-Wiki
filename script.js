var THEME_KEY = 'chargeverse-theme';

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

/* ---------- Helpers ---------- */
function onReady(fn) {
    if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', fn, false);
    } else if (document.attachEvent) {
        window.attachEvent('onload', fn);
    }
}

function trim(s) {
    return s.replace(/^\s+|\s+$/g, '');
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

/* ---------- Expandable search ---------- */
function setupSearch() {
    var box = document.getElementById('search-box');
    var btn = document.getElementById('search-btn');
    var input = document.getElementById('search-input');
    var form = document.getElementById('search-form');
    if (!box || !btn || !input || !form) { return; }

    function expand() {
        box.className = 'search-container expanded';
        input.focus();
    }
    function collapse() {
        box.className = 'search-container';
        input.blur();
    }

    btn.onclick = function () {
        var expanded = box.className.indexOf('expanded') !== -1;
        if (!expanded) {
            expand();
        } else if (trim(input.value) !== '') {
            form.submit();
        } else {
            collapse();
        }
        return false;
    };

    input.onkeydown = function (e) {
        e = e || window.event;
        if (e.keyCode === 27) { collapse(); }
    };
}

/* ---------- Did you know... ---------- */
/* Reads facts.txt */
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
            li.innerHTML = chosen[i]; /* facts may contain links, e.g. <a href="...">  */
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
    /* the timestamp stops browsers showing an old cached copy */
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

onReady(function () {
    setupThemeToggle();
    setupSearch();
    setupFacts();
});
