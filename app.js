// Supabase configuration
const SUPABASE_URL = 'https://lbtxdbqrfkxwfknmgqeq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxidHhkYnFyZmt4d2Zrbm1ncWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzk0NDcsImV4cCI6MjA4Njc1NTQ0N30.cZ9HvlgKsSUPk-ibIctsIxv5IN52N3z3l5YUNkcREpE';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// Global state
let currentUser = null;
let currentEntry = null;
let isSignupMode = false;

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmit = document.getElementById('auth-submit');
const toggleMode = document.getElementById('toggle-mode');
const toggleText = document.getElementById('toggle-text');
const authError = document.getElementById('auth-error');
const userEmail = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const entriesList = document.getElementById('entries-list');
const emptyState = document.getElementById('empty-state');
const addEntryBtn = document.getElementById('add-entry-btn');
const addFirstEntry = document.getElementById('add-first-entry');
const entryModal = document.getElementById('entry-modal');
const entryForm = document.getElementById('entry-form');
const closeModal = document.getElementById('close-modal');
const cancelEntry = document.getElementById('cancel-entry');
const modalTitle = document.getElementById('modal-title');

// Check if user is already logged in
checkAuth();

async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        showApp();
    }
}

// Auth form submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        if (isSignupMode) {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password
            });
            if (error) throw error;
            showError('Check your email to confirm your account!');
        } else {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            currentUser = data.user;
            showApp();
        }
    } catch (error) {
        showError(error.message);
    }
});

// Toggle between login and signup
toggleMode.addEventListener('click', (e) => {
    e.preventDefault();
    isSignupMode = !isSignupMode;
    if (isSignupMode) {
        authTitle.textContent = 'Create Account';
        authSubmit.textContent = 'Sign Up';
        toggleText.textContent = 'Already have an account?';
        toggleMode.textContent = 'Sign in';
    } else {
        authTitle.textContent = 'Welcome Back';
        authSubmit.textContent = 'Sign In';
        toggleText.textContent = "Don't have an account?";
        toggleMode.textContent = 'Sign up';
    }
    authError.classList.remove('show');
});

// Logout
logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    currentUser = null;
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    authForm.reset();
});

// Show app
function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex';
    userEmail.textContent = currentUser.email;
    loadEntries();
}

// Show error
function showError(message) {
    authError.textContent = message;
    authError.classList.add('show');
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const view = item.dataset.view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${view}-view`).classList.add('active');
    });
});

// Load vault entries
async function loadEntries() {
    const { data, error } = await supabaseClient
        .from('vault_entries')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading entries:', error);
        return;
    }
    
    if (data.length === 0) {
        emptyState.style.display = 'block';
        entriesList.innerHTML = '';
    } else {
        emptyState.style.display = 'none';
        displayEntries(data);
    }
}

// Display entries
function displayEntries(entries) {
    entriesList.innerHTML = entries.map(entry => `
        <div class="entry-card" data-id="${entry.id}">
            <div class="entry-header">
                <div class="entry-title">${entry.title}</div>
                <div class="entry-category">${entry.category || 'Other'}</div>
            </div>
            <div class="entry-type">${entry.entry_type || 'General'}</div>
            ${entry.content?.notes ? `<div class="entry-preview">${entry.content.notes.substring(0, 100)}...</div>` : ''}
            <div class="entry-actions">
                <button class="edit-btn" onclick="editEntry('${entry.id}')">Edit</button>
                <button class="delete-btn" onclick="deleteEntry('${entry.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Add entry
addEntryBtn.addEventListener('click', () => openModal());
addFirstEntry.addEventListener('click', () => openModal());

function openModal(entry = null) {
    currentEntry = entry;
    if (entry) {
        modalTitle.textContent = 'Edit Entry';
        document.getElementById('entry-title').value = entry.title;
        document.getElementById('entry-category').value = entry.category || 'Other';
        document.getElementById('entry-type').value = entry.entry_type || 'Other';
        document.getElementById('entry-username').value = entry.content?.username || '';
        document.getElementById('entry-password').value = entry.content?.password || '';
        document.getElementById('entry-notes').value = entry.content?.notes || '';
    } else {
        modalTitle.textContent = 'Add Entry';
        entryForm.reset();
    }
    entryModal.classList.add('show');
}

closeModal.addEventListener('click', () => entryModal.classList.remove('show'));
cancelEntry.addEventListener('click', () => entryModal.classList.remove('show'));

// Save entry
entryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const entryData = {
        title: document.getElementById('entry-title').value,
        category: document.getElementById('entry-category').value,
        entry_type: document.getElementById('entry-type').value,
        content: {
            username: document.getElementById('entry-username').value,
            password: document.getElementById('entry-password').value,
            notes: document.getElementById('entry-notes').value
        },
        user_id: currentUser.id
    };
    
    if (currentEntry) {
        const { error } = await supabaseClient
            .from('vault_entries')
            .update(entryData)
            .eq('id', currentEntry.id);
        if (error) console.error('Error updating entry:', error);
    } else {
        const { error } = await supabaseClient
            .from('vault_entries')
            .insert([entryData]);
        if (error) console.error('Error creating entry:', error);
    }
    
    entryModal.classList.remove('show');
    loadEntries();
});

// Edit entry
async function editEntry(id) {
    const { data, error } = await supabaseClient
        .from('vault_entries')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        console.error('Error loading entry:', error);
        return;
    }
    
    openModal(data);
}

// Delete entry
async function deleteEntry(id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    const { error } = await supabaseClient
        .from('vault_entries')
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('Error deleting entry:', error);
        return;
    }
    
    loadEntries();
}
