// Supabase 設定
const SUPABASE_URL = 'https://qvjfohsitmvzirajpvkd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_T5w-7EI4fRfQBSMtIDcv6Q_WeXmBEf9';
const ADMIN_EMAIL_STORAGE_KEY = 'diary-admin-email';
let supabaseClient = null;
let adminEmail = localStorage.getItem(ADMIN_EMAIL_STORAGE_KEY) || '';
let currentAuthUser = null;

function isSupabaseConfigured() {
    return (
        SUPABASE_URL &&
        SUPABASE_URL.startsWith('https://') &&
        SUPABASE_ANON_KEY &&
        SUPABASE_ANON_KEY.startsWith('sb_')
    );
}

function initSupabase() {
    if (!window.supabase) {
        console.error('Supabase JS SDK is not loaded.');
        return false;
    }

    if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    return true;
}

function ensureSupabaseReady() {
    if (!isSupabaseConfigured()) {
        alert('Supabase の URL と anon key を設定してください。diary.js を編集してから再読み込みしてください。');
        return false;
    }

    if (!initSupabase()) {
        alert('Supabase の読み込みに失敗しました。ページを再読み込みしてください。');
        return false;
    }

    return true;
}

async function getSupabaseHeaders(includeJsonBody = true) {
    const headers = {
        apikey: SUPABASE_ANON_KEY,
        Accept: 'application/json'
    };

    if (includeJsonBody) {
        headers['Content-Type'] = 'application/json';
    }

    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.access_token) {
            headers.Authorization = `Bearer ${session.access_token}`;
        }
    }

    return headers;
}

function setAdminEmail(email) {
    adminEmail = (email || '').trim().toLowerCase();
    if (adminEmail) {
        localStorage.setItem(ADMIN_EMAIL_STORAGE_KEY, adminEmail);
    } else {
        localStorage.removeItem(ADMIN_EMAIL_STORAGE_KEY);
    }
}

function isAdminEmail(email) {
    return Boolean(email && adminEmail && email.toLowerCase() === adminEmail);
}

async function requireAdminAccess() {
    if (!ensureSupabaseReady()) {
        return null;
    }

    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) {
        console.error('getSession failed', sessionError);
        alert('認証状態の確認に失敗しました。');
        return null;
    }

    if (!session?.user) {
        alert('日記の追加・削除にはログインが必要です。');
        return null;
    }

    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error) {
        console.error('getUser failed', error);
        alert('認証状態の確認に失敗しました。');
        return null;
    }

    if (!user) {
        alert('日記の追加・削除にはログインが必要です。');
        return null;
    }

    if (!isAdminEmail(user.email)) {
        alert('管理者アカウントでログインしてください。');
        return null;
    }

    currentAuthUser = user;
    return user;
}

// 日記一覧の取得
async function getDiaries() {
    if (!ensureSupabaseReady()) {
        return [];
    }

    try {
        const headers = await getSupabaseHeaders(false);
        const response = await fetch(`${SUPABASE_URL}/rest/v1/diaries?select=*&order=created_at.desc`, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('getDiaries failed', { status: response.status, body: errorText, url: `${SUPABASE_URL}/rest/v1/diaries?select=*&order=created_at.desc` });
            return [];
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('getDiaries exception', error);
        return [];
    }
}

// コメント一覧の取得
async function getCommentsByDiary() {
    if (!ensureSupabaseReady()) {
        return {};
    }

    try {
        const headers = await getSupabaseHeaders(false);
        const response = await fetch(`${SUPABASE_URL}/rest/v1/comments?select=*&order=created_at.asc`, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('getCommentsByDiary failed', { status: response.status, body: errorText });
            return {};
        }

        const data = await response.json();
        return (Array.isArray(data) ? data : []).reduce((acc, comment) => {
            if (!acc[comment.diary_id]) {
                acc[comment.diary_id] = [];
            }
            acc[comment.diary_id].push(comment);
            return acc;
        }, {});
    } catch (error) {
        console.error(error);
        return {};
    }
}

// 日記の追加
async function addDiary(title, content) {
    const user = await requireAdminAccess();
    if (!user) {
        return false;
    }

    try {
        const headers = await getSupabaseHeaders(true);
        const response = await fetch(`${SUPABASE_URL}/rest/v1/diaries`, {
            method: 'POST',
            headers,
            body: JSON.stringify([
                {
                    title: title,
                    content: content,
                    created_at: new Date().toISOString()
                }
            ])
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('addDiary failed', response.status, errorText);
            alert('日記の保存に失敗しました。Supabase のテーブル設定を確認してください。');
            return false;
        }

        return true;
    } catch (error) {
        console.error(error);
        alert('日記の保存に失敗しました。Supabase のテーブル設定を確認してください。');
        return false;
    }
}

// 日記の削除
async function deleteDiary(id) {
    const user = await requireAdminAccess();
    if (!user) {
        return false;
    }

    try {
        const headers = await getSupabaseHeaders(true);
        const diaryResponse = await fetch(`${SUPABASE_URL}/rest/v1/diaries?id=eq.${id}`, {
            method: 'DELETE',
            headers
        });

        if (!diaryResponse.ok) {
            const errorText = await diaryResponse.text();
            console.error('deleteDiary failed', diaryResponse.status, errorText);
            alert('日記の削除に失敗しました。');
            return false;
        }

        const commentResponse = await fetch(`${SUPABASE_URL}/rest/v1/comments?diary_id=eq.${id}`, {
            method: 'DELETE',
            headers
        });

        if (!commentResponse.ok) {
            const errorText = await commentResponse.text();
            console.error('deleteComments failed', commentResponse.status, errorText);
        }

        return true;
    } catch (error) {
        console.error(error);
        alert('日記の削除に失敗しました。');
        return false;
    }
}

// コメントの追加
async function addComment(diaryId, name, text) {
    if (!ensureSupabaseReady()) {
        return false;
    }

    try {
        const headers = await getSupabaseHeaders(true);
        const response = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
            method: 'POST',
            headers,
            body: JSON.stringify([
                {
                    diary_id: diaryId,
                    name: name || '名前なし',
                    text: text,
                    created_at: new Date().toISOString()
                }
            ])
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('addComment failed', response.status, errorText);
            alert('コメントの保存に失敗しました。');
            return false;
        }

        return true;
    } catch (error) {
        console.error(error);
        alert('コメントの保存に失敗しました。');
        return false;
    }
}

// 日記一覧の表示
async function displayDiaries() {
    const diaryList = document.getElementById('diaryList');
    if (!diaryList) {
        return;
    }

    diaryList.innerHTML = '<p class="empty-message">読み込み中...</p>';

    const diaries = await getDiaries();
    const commentsByDiary = await getCommentsByDiary();
    const canManage = Boolean(currentAuthUser && isAdminEmail(currentAuthUser.email));

    if (diaries.length === 0) {
        diaryList.innerHTML = '<p class="empty-message">まだ日記がありません。書いてみましょう！</p>';
        return;
    }

    diaryList.innerHTML = diaries.map(diary => {
        const comments = commentsByDiary[diary.id] || [];
        const commentsHtml = comments.map(comment => `
            <div class="diary-comment">
                <div class="diary-comment-name">${escapeHtml(comment.name)} - ${formatDate(comment.created_at)}</div>
                <div class="diary-comment-text">${escapeHtml(comment.text)}</div>
            </div>
        `).join('');

        return `
            <div class="diary-entry">
                <div class="diary-entry-meta">
                    <div class="diary-entry-date">${formatDate(diary.created_at)}</div>
                    <div class="diary-entry-title">${escapeHtml(diary.title)}</div>
                </div>
                <div class="diary-entry-content">${escapeHtml(diary.content)}</div>
                ${canManage ? `<button class="diary-entry-delete" onclick="handleDelete(${diary.id})">削除</button>` : ''}

                <div class="diary-comments-section">
                    <div class="diary-comments-title">コメント (${comments.length})</div>
                    ${comments.length > 0 ? `<div class="diary-comments">${commentsHtml}</div>` : '<p style="font-size: 12px; color: #999;">まだコメントがありません</p>'}

                    <form class="diary-comment-form" onsubmit="handleAddComment(event, ${diary.id})">
                        <input
                            type="text"
                            class="comment-name"
                            placeholder="お名前（空でもOK）"
                        >
                        <textarea
                            class="comment-text"
                            placeholder="コメントを書いてください..."
                            required
                        ></textarea>
                        <button type="submit">コメントする</button>
                    </form>
                </div>
            </div>
        `;
    }).join('');
}

// XSS対策：HTMLエスケープ
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function formatDate(value) {
    if (!value) {
        return '日時不明';
    }
    return new Date(value).toLocaleString('ja-JP');
}

// 削除処理
async function handleDelete(id) {
    if (confirm('この日記を削除してもよろしいですか？')) {
        const success = await deleteDiary(id);
        if (success) {
            await displayDiaries();
        }
    }
}

// コメント追加処理
async function handleAddComment(event, diaryId) {
    event.preventDefault();

    const form = event.target;
    const nameInput = form.querySelector('.comment-name');
    const textInput = form.querySelector('.comment-text');

    const name = nameInput.value.trim();
    const text = textInput.value.trim();

    if (text) {
        const success = await addComment(diaryId, name, text);
        if (success) {
            nameInput.value = '';
            textInput.value = '';
            await displayDiaries();
        }
    }
}

function updateDiaryWriteAccess(user) {
    const diaryForm = document.getElementById('diaryForm');
    const titleInput = document.getElementById('diaryTitle');
    const contentInput = document.getElementById('diaryContent');
    const submitButton = diaryForm?.querySelector('button[type="submit"]');
    const canWrite = Boolean(user && isAdminEmail(user.email));

    if (titleInput) {
        titleInput.disabled = !canWrite;
    }
    if (contentInput) {
        contentInput.disabled = !canWrite;
    }
    if (submitButton) {
        submitButton.disabled = !canWrite;
    }
    if (diaryForm) {
        diaryForm.style.opacity = canWrite ? '1' : '0.7';
    }
}

function updateAuthUI(user) {
    currentAuthUser = user || null;
    const status = document.getElementById('authStatus');
    const signOutButton = document.getElementById('signOutButton');

    if (status) {
        if (user) {
            const roleText = isAdminEmail(user.email) ? '管理者としてログイン中' : 'ログイン中（管理者メールと一致していません）';
            status.textContent = `${roleText}: ${user.email}`;
        } else {
            status.textContent = 'ログインしてください';
        }
    }

    if (signOutButton) {
        signOutButton.style.display = user ? 'inline-block' : 'none';
    }

    updateDiaryWriteAccess(user);
    void displayDiaries();
}

async function refreshAuthUser() {
    if (!ensureSupabaseReady()) {
        return null;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
        currentAuthUser = null;
        updateAuthUI(null);
        return null;
    }

    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error) {
        console.error('getUser failed', error);
        return null;
    }

    currentAuthUser = user;
    updateAuthUI(user);
    return user;
}

async function initAuth() {
    if (!ensureSupabaseReady()) {
        return;
    }

    const authEmailInput = document.getElementById('authEmail');
    if (authEmailInput) {
        authEmailInput.value = adminEmail;
        authEmailInput.addEventListener('input', (event) => {
            setAdminEmail(event.target.value);
        });
    }

    const user = await refreshAuthUser();
    if (!user) {
        updateAuthUI(null);
    }

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
            currentAuthUser = session.user;
            updateAuthUI(session.user);
        } else {
            const freshUser = await refreshAuthUser();
            updateAuthUI(freshUser);
        }
    });
}

// 認証フォーム送信の処理
document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target;
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const mode = e.submitter?.dataset?.mode || 'signin';

    if (!email) {
        alert('管理者メールアドレスを入力してください。');
        return;
    }

    setAdminEmail(email);

    if (!ensureSupabaseReady()) {
        return;
    }

    if (mode === 'signup') {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
            alert(`登録に失敗しました: ${error.message}`);
            return;
        }

        if (data.user && !data.session) {
            alert('登録しました。確認メールが必要な場合があります。');
        } else {
            alert('登録してログインしました。');
        }
    } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            alert(`ログインに失敗しました: ${error.message}`);
            return;
        }

        if (data.session) {
            alert('ログインしました。');
        }
    }

    await refreshAuthUser();
    form.reset();
    const authEmailInput = document.getElementById('authEmail');
    if (authEmailInput) {
        authEmailInput.value = adminEmail;
    }
});

// ログアウト
if (document.getElementById('signOutButton')) {
    document.getElementById('signOutButton').addEventListener('click', async () => {
        if (!ensureSupabaseReady()) {
            return;
        }

        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            alert(`ログアウトに失敗しました: ${error.message}`);
            return;
        }

        currentAuthUser = null;
        updateAuthUI(null);
        alert('ログアウトしました。');
    });
}

// フォーム送信の処理
document.getElementById('diaryForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target;
    const title = document.getElementById('diaryTitle').value.trim();
    const content = document.getElementById('diaryContent').value.trim();

    if (title && content) {
        const success = await addDiary(title, content);
        if (success) {
            form.reset();
            await displayDiaries();
        }
    }
});

// ページロード時に日記を表示
document.addEventListener('DOMContentLoaded', async () => {
    void displayDiaries();
    await initAuth();
});
