const SUPABASE_URL = 'https://lbtxdbqrfkxwfknmgqeq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxidHhkYnFyZmt4d2Zrbm1ncWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzk0NDcsImV4cCI6MjA4Njc1NTQ0N30.cZ9HvlgKsSUPk-ibIctsIxv5IN52N3z3l5YUNkcREpE';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentEntry = null;
let currentContact = null;
let isSignupMode = false;

// ============================================
// AUTH
// ============================================

const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmit = document.getElementById('auth-submit');
const toggleMode = document.getElementById('toggle-mode');
const toggleText = document.getElementById('toggle-text');
const authError = document.getElementById('auth-error');
const userEmailEl = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

checkAuth();

async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        showApp();
    }
}

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        if (isSignupMode) {
            const { error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;
            showError('Check your email to confirm your account!');
        } else {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            currentUser = data.user;
            showApp();
        }
    } catch (error) {
        showError(error.message);
    }
});

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

logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    currentUser = null;
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    authForm.reset();
});

function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex';
    userEmailEl.textContent = currentUser.email;
    loadEntries();
}

function showError(message) {
    authError.textContent = message;
    authError.classList.add('show');
}

// ============================================
// NAVIGATION
// ============================================

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const view = item.dataset.view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(view + '-view').classList.add('active');

        if (view === 'contacts') loadContacts();
        if (view === 'checkin') loadCheckinStatus();
        if (view === 'settings') loadSettings();
    });
});

// ============================================
// VAULT ENTRIES
// ============================================

const entriesList = document.getElementById('entries-list');
const emptyState = document.getElementById('empty-state');
const addEntryBtn = document.getElementById('add-entry-btn');
const addFirstEntry = document.getElementById('add-first-entry');
const entryModal = document.getElementById('entry-modal');
const entryForm = document.getElementById('entry-form');
const closeModal = document.getElementById('close-modal');
const cancelEntry = document.getElementById('cancel-entry');
const modalTitle = document.getElementById('modal-title');

async function loadEntries() {
    const { data, error } = await supabaseClient
        .from('vault_entries')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) { console.error('Error loading entries:', error); return; }

    if (data.length === 0) {
        emptyState.style.display = 'block';
        entriesList.innerHTML = '';
    } else {
        emptyState.style.display = 'none';
        entriesList.innerHTML = data.map(entry => `
            <div class="entry-card">
                <div class="entry-header">
                    <div class="entry-title">${entry.title}</div>
                    <div class="entry-category">${entry.category || 'Other'}</div>
                </div>
                <div class="entry-type">${entry.entry_type || 'General'}</div>
                ${entry.content && entry.content.notes ? '<div class="entry-preview">' + entry.content.notes.substring(0, 100) + '...</div>' : ''}
                <div class="entry-actions">
                    <button class="edit-btn" onclick="editEntry('${entry.id}')">Edit</button>
                    <button class="delete-btn" onclick="deleteEntry('${entry.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
}

if (addEntryBtn) addEntryBtn.addEventListener('click', () => openModal());
if (addFirstEntry) addFirstEntry.addEventListener('click', () => openModal());

function openModal(entry = null) {
    currentEntry = entry;
    if (entry) {
        modalTitle.textContent = 'Edit Entry';
        document.getElementById('entry-title').value = entry.title;
        document.getElementById('entry-category').value = entry.category || 'Other';
        document.getElementById('entry-type').value = entry.entry_type || 'Other';
        document.getElementById('entry-username').value = entry.content ? entry.content.username || '' : '';
        document.getElementById('entry-password').value = entry.content ? entry.content.password || '' : '';
        document.getElementById('entry-notes').value = entry.content ? entry.content.notes || '' : '';
    } else {
        modalTitle.textContent = 'Add Entry';
        entryForm.reset();
    }
    entryModal.classList.add('show');
}

if (closeModal) closeModal.addEventListener('click', () => entryModal.classList.remove('show'));
if (cancelEntry) cancelEntry.addEventListener('click', () => entryModal.classList.remove('show'));

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
        await supabaseClient.from('vault_entries').update(entryData).eq('id', currentEntry.id);
    } else {
        await supabaseClient.from('vault_entries').insert([entryData]);
    }

    entryModal.classList.remove('show');
    loadEntries();
});

async function editEntry(id) {
    const { data } = await supabaseClient.from('vault_entries').select('*').eq('id', id).single();
    if (data) openModal(data);
}

async function deleteEntry(id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    await supabaseClient.from('vault_entries').delete().eq('id', id);
    loadEntries();
}

// ============================================
// TRUSTED CONTACTS
// ============================================

const contactsList = document.getElementById('contacts-list');
const contactsEmptyState = document.getElementById('contacts-empty-state');
const addContactBtn = document.getElementById('add-contact-btn');
const addFirstContact = document.getElementById('add-first-contact');
const contactModal = document.getElementById('contact-modal');
const contactForm = document.getElementById('contact-form');
const closeContactModal = document.getElementById('close-contact-modal');
const cancelContact = document.getElementById('cancel-contact');
const contactModalTitle = document.getElementById('contact-modal-title');

async function loadContacts() {
    const { data, error } = await supabaseClient
        .from('trusted_contacts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) { console.error('Error loading contacts:', error); return; }

    if (data.length === 0) {
        contactsEmptyState.style.display = 'block';
        contactsList.innerHTML = '';
    } else {
        contactsEmptyState.style.display = 'none';
        contactsList.innerHTML = data.map(contact => `
            <div class="contact-card">
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-email">${contact.email}</div>
                    <span class="contact-relationship">${contact.relationship || 'Other'}</span>
                </div>
                <div class="contact-actions">
                    <button class="edit-btn" onclick="editContact('${contact.id}')">Edit</button>
                    <button class="delete-btn" onclick="deleteContact('${contact.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
}

if (addContactBtn) addContactBtn.addEventListener('click', () => openContactModal());
if (addFirstContact) addFirstContact.addEventListener('click', () => openContactModal());

function openContactModal(contact = null) {
    currentContact = contact;
    if (contact) {
        contactModalTitle.textContent = 'Edit Contact';
        document.getElementById('contact-name').value = contact.name;
        document.getElementById('contact-email').value = contact.email;
        document.getElementById('contact-relationship').value = contact.relationship || 'Other';
    } else {
        contactModalTitle.textContent = 'Add Trusted Contact';
        contactForm.reset();
    }
    contactModal.classList.add('show');
}

if (closeContactModal) closeContactModal.addEventListener('click', () => contactModal.classList.remove('show'));
if (cancelContact) cancelContact.addEventListener('click', () => contactModal.classList.remove('show'));

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentContact) {
        const { data: existing } = await supabaseClient
            .from('trusted_contacts').select('id').eq('user_id', currentUser.id);
        if (existing && existing.length >= 1) {
            alert('Free plan allows 1 trusted contact. Upgrade to Premium for 3 contacts!');
            return;
        }
    }

    const contactData = {
        name: document.getElementById('contact-name').value,
        email: document.getElementById('contact-email').value,
        relationship: document.getElementById('contact-relationship').value,
        user_id: currentUser.id
    };

    if (currentContact) {
        await supabaseClient.from('trusted_contacts').update(contactData).eq('id', currentContact.id);
    } else {
        await supabaseClient.from('trusted_contacts').insert([contactData]);
    }

    contactModal.classList.remove('show');
    loadContacts();
});

async function editContact(id) {
    const { data } = await supabaseClient.from('trusted_contacts').select('*').eq('id', id).single();
    if (data) openContactModal(data);
}

async function deleteContact(id) {
    if (!confirm('Are you sure you want to remove this contact?')) return;
    await supabaseClient.from('trusted_contacts').delete().eq('id', id);
    loadContacts();
}

// ============================================
// CHECK-IN SYSTEM
// ============================================

async function loadCheckinStatus() {
    const { data, error } = await supabaseClient
        .from('check_ins')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error loading check-in:', error);
        return;
    }

    let checkinData = data;

    if (!checkinData) {
        const { data: newData } = await supabaseClient
            .from('check_ins')
            .insert([{
                user_id: currentUser.id,
                frequency_days: 30,
                last_check_in: new Date().toISOString()
            }])
            .select()
            .single();
        checkinData = newData;
    }

    displayCheckinStatus(checkinData);
    setupCheckinButtons(checkinData);
}

function displayCheckinStatus(d) {
    const statusIndicator = document.getElementById('status-indicator');
    const statusIcon = document.getElementById('status-icon');
    const statusTitle = document.getElementById('status-title');
    const statusMessage = document.getElementById('status-message');
    const lastCheckinDate = document.getElementById('last-checkin-date');
    const nextCheckinDate = document.getElementById('next-checkin-date');
    const currentFrequency = document.getElementById('current-frequency');

    if (!statusIndicator || !lastCheckinDate) return;

    const now = new Date();
    const nextCheckin = new Date(d.next_check_in);
    const daysLeft = Math.ceil((nextCheckin - now) / (1000 * 60 * 60 * 24));

    lastCheckinDate.textContent = new Date(d.last_check_in).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    nextCheckinDate.textContent = nextCheckin.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    currentFrequency.textContent = d.frequency_days + ' days';

    const radio = document.querySelector('input[name="frequency"][value="' + d.frequency_days + '"]');
    if (radio) radio.checked = true;

    if (daysLeft < 0) {
        statusIndicator.className = 'status-indicator overdue';
        statusIcon.textContent = '⚠️';
        statusTitle.textContent = 'Check-In Overdue!';
        statusMessage.innerHTML = 'You missed your check-in by <strong>' + Math.abs(daysLeft) + ' days</strong>';
    } else if (daysLeft <= 3) {
        statusIndicator.className = 'status-indicator warning';
        statusIcon.textContent = '⏰';
        statusTitle.textContent = 'Check-In Due Soon';
        statusMessage.innerHTML = 'Your check-in is due in <strong>' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + '</strong>';
    } else {
        statusIndicator.className = 'status-indicator ok';
        statusIcon.textContent = '✅';
        statusTitle.textContent = "You're all set!";
        statusMessage.innerHTML = 'Your next check-in is due in <strong>' + daysLeft + ' days</strong>';
    }
}

function setupCheckinButtons(initialData) {
    const checkinBtn = document.getElementById('checkin-now-btn');
    const freqBtn = document.getElementById('save-frequency-btn');

    if (checkinBtn) {
        checkinBtn.addEventListener('click', async function() {
            console.log('Check-in button clicked!');
            
            const { data: updated, error } = await supabaseClient
                .from('check_ins')
                .update({ last_check_in: new Date().toISOString() })
                .eq('user_id', currentUser.id)
                .select()
                .single();

            if (error) {
                console.error('Error:', error);
                alert('Error checking in. Please try again.');
                return;
            }

            checkinBtn.textContent = '✓ Check-In Successful!';
            checkinBtn.style.background = '#10b981';
            
            setTimeout(() => {
                checkinBtn.textContent = '✓ I\'m OK - Check In Now';
                checkinBtn.style.background = '';
            }, 2000);

            displayCheckinStatus(updated);
        });
    }

    if (freqBtn) {
        freqBtn.addEventListener('click', async function() {
            const selected = parseInt(document.querySelector('input[name="frequency"]:checked').value);
            
            if (selected === 60 || selected === 90) {
                alert('60 and 90 day check-ins are Premium only!');
                return;
            }

            const { data: updated, error } = await supabaseClient
                .from('check_ins')
                .update({ frequency_days: selected })
                .eq('user_id', currentUser.id)
                .select()
                .single();

            if (error) {
                console.error('Error:', error);
                return;
            }

            freqBtn.textContent = '✓ Saved!';
            freqBtn.style.background = '#10b981';
            
            setTimeout(() => {
                freqBtn.textContent = 'Save Frequency';
                freqBtn.style.background = '';
            }, 2000);

            displayCheckinStatus(updated);
        });
    }
}

// ============================================
// SETTINGS
// ============================================

function loadSettings() {
    const settingsEmail = document.getElementById('settings-email');
    const settingsCreated = document.getElementById('settings-created');
    const passwordForm = document.getElementById('password-form');
    const deleteAccountBtn = document.getElementById('delete-account-btn');

    if (settingsEmail) settingsEmail.textContent = currentUser.email;

    if (settingsCreated) {
        settingsCreated.textContent = new Date(currentUser.created_at).toLocaleDateString('en-GB', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    if (passwordForm) {
        passwordForm.onsubmit = async function(e) {
            e.preventDefault();
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const passwordError = document.getElementById('password-error');
            const passwordSuccess = document.getElementById('password-success');

            passwordError.classList.remove('show');
            passwordSuccess.style.display = 'none';

            if (newPassword !== confirmPassword) {
                passwordError.textContent = 'Passwords do not match!';
                passwordError.classList.add('show');
                return;
            }

            if (newPassword.length < 8) {
                passwordError.textContent = 'Password must be at least 8 characters!';
                passwordError.classList.add('show');
                return;
            }

            const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

            if (error) {
                passwordError.textContent = error.message;
                passwordError.classList.add('show');
            } else {
                passwordSuccess.style.display = 'block';
                passwordForm.reset();
                setTimeout(() => { passwordSuccess.style.display = 'none'; }, 3000);
            }
        };
    }

    if (deleteAccountBtn) {
        deleteAccountBtn.onclick = async function() {
            if (!confirm('Are you sure? This cannot be undone!')) return;
            if (!confirm('This will permanently delete ALL your data. Are you absolutely sure?')) return;

            await supabaseClient.from('vault_entries').delete().eq('user_id', currentUser.id);
            await supabaseClient.from('trusted_contacts').delete().eq('user_id', currentUser.id);
            await supabaseClient.from('check_ins').delete().eq('user_id', currentUser.id);
            await supabaseClient.auth.signOut();
            alert('Your account has been deleted.');
            window.location.href = 'index.html';
        };
    }
}
