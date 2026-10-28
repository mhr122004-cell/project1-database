// Frontend: talks to the backend with fetch and renders the results table.

const API = 'http://localhost:5050';

// build the backend URL for each search form (data-search attribute)
const SEARCHES = {
    'name':             f => ({url: `/search/name?firstname=${enc(f.firstname)}&lastname=${enc(f.lastname)}`,
                               title: `Name: ${[f.firstname, f.lastname].filter(Boolean).join(' ')}`}),
    'userid':           f => ({url: `/search/userid/${enc(f.username)}`, title: `User ID = ${f.username}`}),
    'salary':           f => ({url: `/search/salary?min=${enc(f.min)}&max=${enc(f.max)}`,
                               title: `Salary between ${f.min} and ${f.max}`}),
    'age':              f => ({url: `/search/age?min=${enc(f.min)}&max=${enc(f.max)}`,
                               title: `Age between ${f.min} and ${f.max}`}),
    'registered-after': f => ({url: `/search/registered-after/${enc(f.username)}`,
                               title: `Registered after ${f.username}`}),
    'never-signed-in':  () => ({url: '/search/never-signed-in', title: 'Never signed in'}),
    'same-day':         f => ({url: `/search/same-day/${enc(f.username)}`,
                               title: `Registered the same day as ${f.username}`}),
    'today':            () => ({url: '/search/today', title: 'Registered today'}),
};

function enc(value){
    return encodeURIComponent((value || '').trim());
}

function formValues(form){
    return Object.fromEntries(new FormData(form).entries());
}

async function callApi(path, options = {}){
    const response = await fetch(API + path, {
        headers: {'Content-type': 'application/json'},
        ...options
    });
    const body = await response.json();
    if(!response.ok) throw new Error(body.error || 'Request failed');
    return body.data;
}

function showMessage(id, text, ok){
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = 'message ' + (ok ? 'ok' : 'error');
}

function loadUsers(path, title){
    document.getElementById('results-title').textContent = title;
    callApi(path)
    .then(loadHTMLTable)
    .catch(err => loadHTMLTable([], err.message));
}

// page load: show everyone
document.addEventListener('DOMContentLoaded', () => loadUsers('/users', 'All users'));

document.getElementById('show-all-btn').onclick = () => loadUsers('/users', 'All users');

// 1. registration
document.getElementById('register-form').addEventListener('submit', function(event){
    event.preventDefault();
    callApi('/register', {method: 'POST', body: JSON.stringify(formValues(this))})
    .then(data => {
        showMessage('register-msg', `Registered ${data[0].username}.`, true);
        this.reset();
        loadUsers('/users', 'All users');
    })
    .catch(err => showMessage('register-msg', err.message, false));
});

// 2. sign-in
document.getElementById('signin-form').addEventListener('submit', function(event){
    event.preventDefault();
    callApi('/signin', {method: 'POST', body: JSON.stringify(formValues(this))})
    .then(user => {
        showMessage('signin-msg', `Welcome, ${user.firstname || user.username}!`, true);
        document.getElementById('signed-in-as').textContent = `Signed in as ${user.username}`;
        this.reset();
        loadUsers('/users', 'All users');
    })
    .catch(err => showMessage('signin-msg', err.message, false));
});

// 3-10. searches
document.querySelectorAll('form.search').forEach(form => {
    form.addEventListener('submit', event => {
        event.preventDefault();
        const values = formValues(form);
        if(form.dataset.search === 'name' && !values.firstname.trim() && !values.lastname.trim()){
            return loadHTMLTable([], 'Enter a first name, a last name, or both.');
        }
        const {url, title} = SEARCHES[form.dataset.search](values);
        loadUsers(url, title);
    });
});

function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"']/g,
        c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}

function loadHTMLTable(data, emptyText = 'No users found'){
    const table = document.querySelector('table tbody');

    if(data.length === 0){
        table.innerHTML = `<tr><td class='no-data' colspan='7'>${escapeHtml(emptyText)}</td></tr>`;
        return;
    }

    let tableHtml = "";
    data.forEach(function ({username, firstname, lastname, salary, age, registerday, signintime}){
         tableHtml += "<tr>";
         tableHtml += `<td>${escapeHtml(username)}</td>`;
         tableHtml += `<td>${escapeHtml(firstname)}</td>`;
         tableHtml += `<td>${escapeHtml(lastname)}</td>`;
         tableHtml += `<td>${salary == null ? '' : '$' + Number(salary).toLocaleString()}</td>`;
         tableHtml += `<td>${escapeHtml(age)}</td>`;
         tableHtml += `<td>${escapeHtml(registerday)}</td>`;
         tableHtml += `<td>${signintime ? escapeHtml(signintime) : '<span class="muted">never</span>'}</td>`;
         tableHtml += "</tr>";
    });

    table.innerHTML = tableHtml;
}
