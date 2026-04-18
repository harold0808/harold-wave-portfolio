import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://bofxeucvvtzpwktwpfjw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvZnhldWN2dnR6cHdrdHdwZmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTcyNTAsImV4cCI6MjA5MTczMzI1MH0.D5V_2O_uVSNIEn_4BFLXPsPJJVhXOXERPO_xkJ38N-Y';
const supabase = createClient(supabaseUrl, supabaseKey);

let tracks = [];

async function fetchTracks() {
    const { data, error } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching tracks:', error);
        return;
    }
    
    // If no tracks exist in DB yet, provide dummy ones for visual layout
    if (!data || data.length === 0) {
        tracks = [
            { id: 1, title: "Midnight Drive", tags: ["Trap", "120 BPM"], audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
            { id: 2, title: "OVO Vibes", tags: ["R&B", "95 BPM"], audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
            { id: 3, title: "Toronto Lights", tags: ["Hip-Hop", "88 BPM"], audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
        ];
    } else {
        tracks = data;
    }
    renderTracks();
}

const trackListEl = document.getElementById('track-list');
const audioPlayerEl = document.getElementById('audio-player');
const realAudioPlayer = document.getElementById('real-audio-player');
const playerTitle = document.getElementById('player-title');
const playerTag = document.getElementById('player-tag');
const playPauseBtn = document.getElementById('play-pause-btn');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const playerArt = document.getElementById('player-art');

let currentTrack = null;
let isPlaying = false;

function renderTracks() {
    trackListEl.innerHTML = '';
    tracks.forEach(track => {
        const item = document.createElement('div');
        item.className = 'track-item';
        
        let tagsHtml = '';
        if(track.tags && Array.isArray(track.tags)) tagsHtml = track.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        else if (track.bpm) tagsHtml = `<span class="tag">${track.bpm} BPM</span>`;

        item.innerHTML = `
            <div class="track-info">
                <h3>${track.title}</h3>
                <div class="track-tags">
                    ${tagsHtml}
                </div>
            </div>
            <button class="play-btn">▶</button>
        `;
        item.addEventListener('click', () => loadAndPlayTrack(track));
        trackListEl.appendChild(item);
    });
}

function loadAndPlayTrack(track) {
    if(currentTrack?.id === track.id) {
        if(isPlaying) pauseTrack();
        else playTrack();
        return;
    }
    
    currentTrack = track;
    playerTitle.textContent = track.title;
    
    // Handle dynamic tags for player
    let tagStr = '';
    if(track.tags && Array.isArray(track.tags)) tagStr = track.tags.join(' • ');
    else if (track.bpm) tagStr = `${track.bpm} BPM`;
    playerTag.textContent = tagStr;
    
    // Update track art if available
    if(track.image_url) {
        playerArt.src = track.image_url;
    } else {
        playerArt.src = 'assets/harold_logo.png';
    }
    playerArt.classList.remove('hidden');
    
    // Load audio
    if(track.audio_url) {
        realAudioPlayer.src = track.audio_url;
    }
    
    audioPlayerEl.classList.add('active');
    playPauseBtn.disabled = false;
    
    progressBar.style.width = '0%';
    playTrack();
}

function playTrack() {
    isPlaying = true;
    playPauseBtn.textContent = '⏸';
    if(realAudioPlayer.src) {
        realAudioPlayer.play().catch(e => console.error("Audio play failed:", e));
    }
}

function pauseTrack() {
    isPlaying = false;
    playPauseBtn.textContent = '▶';
    realAudioPlayer.pause();
}

playPauseBtn.addEventListener('click', () => {
    if(isPlaying) pauseTrack();
    else if(currentTrack) playTrack();
});

// Update progress bar as audio plays
realAudioPlayer.addEventListener('timeupdate', () => {
    if (realAudioPlayer.duration) {
        const progressPercent = (realAudioPlayer.currentTime / realAudioPlayer.duration) * 100;
        progressBar.style.width = `${progressPercent}%`;
    }
});

// Reset when audio ends
realAudioPlayer.addEventListener('ended', () => {
    pauseTrack();
    progressBar.style.width = '0%';
    realAudioPlayer.currentTime = 0;
});

// Click on progress bar to seek
progressContainer.addEventListener('click', (e) => {
    if(!currentTrack || !realAudioPlayer.duration) return;
    const rect = progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    realAudioPlayer.currentTime = pos * realAudioPlayer.duration;
    progressBar.style.width = `${pos * 100}%`;
});

// Authentication UI Logic
const loginNavBtn = document.getElementById('login-nav-btn');
const logoutNavBtn = document.getElementById('logout-nav-btn');
const userDisplayLi = document.getElementById('user-display-li');
const authModal = document.getElementById('auth-modal');
const closeModalBtn = document.getElementById('close-modal');

// Auth Form Elements
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const emailLoginBtn = document.getElementById('email-login-btn');
const emailSignupBtn = document.getElementById('email-signup-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const authError = document.getElementById('auth-error');
const authSuccess = document.getElementById('auth-success');

loginNavBtn.addEventListener('click', (e) => { e.preventDefault(); authModal.classList.remove('hidden'); });
closeModalBtn.addEventListener('click', () => authModal.classList.add('hidden'));
window.addEventListener('click', (e) => { if(e.target === authModal) authModal.classList.add('hidden'); });

function showMessage(element, text) {
    element.textContent = text;
    setTimeout(() => { element.textContent = ''; }, 4000);
}

// Supabase Auth Logic
emailSignupBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if(!email || !password) return showMessage(authError, "Please enter email and password.");
    
    const { data, error } = await supabase.auth.signUp({ email, password });
    if(error) showMessage(authError, error.message);
    else {
        showMessage(authSuccess, "Success! Check your email to confirm.");
        authModal.classList.add('hidden');
    }
});

emailLoginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if(!email || !password) return showMessage(authError, "Please enter email and password.");
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) showMessage(authError, error.message);
    else {
        authModal.classList.add('hidden');
        emailInput.value = ''; passwordInput.value = '';
    }
});

googleLoginBtn.addEventListener('click', async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if(error) showMessage(authError, error.message);
});

logoutNavBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
});

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    if(session) {
        loginNavBtn.parentElement.classList.add('hidden');
        userDisplayLi.classList.remove('hidden');
    } else {
        loginNavBtn.parentElement.classList.remove('hidden');
        userDisplayLi.classList.add('hidden');
    }
});

// Contact Form Logic
const contactForm = document.getElementById('contact-form');
const contactStatus = document.getElementById('contact-status');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        const message = document.getElementById('contact-message').value;
        
        contactStatus.textContent = 'Sending...';
        contactStatus.style.color = '#ccc';
        
        const { error } = await supabase.from('messages').insert([{ name, email, content: message }]);
        
        if (error) {
            contactStatus.textContent = 'Error sending message. Try again later.';
            contactStatus.style.color = '#ef4444';
        } else {
            contactStatus.textContent = 'Message sent successfully!';
            contactStatus.style.color = '#10b981';
            contactForm.reset();
        }
    });
}

// Init
fetchTracks();