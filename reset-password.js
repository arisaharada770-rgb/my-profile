const SUPABASE_URL = 'https://qvjfohsitmvzirajpvkd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_T5w-7EI4fRfQBSMtIDcv6Q_WeXmBEf9';
let supabaseClient = null;

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
    if (!SUPABASE_URL || !SUPABASE_URL.startsWith('https://') || !SUPABASE_ANON_KEY) {
        alert('Supabase の設定が正しくありません。');
        return false;
    }
    return initSupabase();
}

function showMessage(elementId, message, isError = false) {
    const el = document.getElementById(elementId);
    if (!el) { return; }
    el.textContent = message;
    el.style.color = isError ? '#b33' : '#666';
    el.classList.remove('is-hidden');
}

function clearMessage(elementId) {
    const el = document.getElementById(elementId);
    if (!el) { return; }
    el.textContent = '';
    el.classList.add('is-hidden');
}

async function requestPasswordReset(email) {
    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        rredirectTo: `${window.location.origin}/my-profile/reset-password.html`
    });

    if (error) {
        throw new Error(error.message || 'パスワード再設定メールの送信中にエラーが発生しました。');
    }

    return data;
}

async function updatePassword(newPassword) {
    const { data, error } = await supabaseClient.auth.updateUser({
        password: newPassword
    });

    if (error) {
        throw new Error(error.message || 'パスワードの更新に失敗しました。');
    }

    return data;
}

function showNewPasswordForm() {
    const resetRequestForm = document.getElementById('resetRequestForm');
    const newPasswordForm = document.getElementById('newPasswordForm');
    if (resetRequestForm && newPasswordForm) {
        resetRequestForm.classList.add('is-hidden');
        newPasswordForm.classList.remove('is-hidden');
    }
}

async function initPasswordResetPage() {
    if (!ensureSupabaseReady()) {
        return;
    }

    // すでにリカバリーセッションがある場合
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        showNewPasswordForm();
    }

    // メールのリンクから戻ってきたとき
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") {
            showNewPasswordForm();
            showMessage(
                "resetNotice",
                "新しいパスワードを入力してください。"
            );
        }
    });
}

async function handleResetRequest(event) {
    event.preventDefault();
    const emailInput = document.getElementById('resetEmail');
    if (!emailInput) {
        return;
    }

    const email = emailInput.value.trim();
    if (!email) {
        alert('メールアドレスを入力してください。');
        return;
    }

    try {
        await requestPasswordReset(email);
        showMessage('resetResult', '再設定用のリンクを送信しました。メールを確認してください。');
    } catch (error) {
        showMessage('resetResult', error.message, true);
    }
}

async function handleNewPasswordSubmit(event) {
    event.preventDefault();
    const passwordInput = document.getElementById('newPassword');
    const confirmInput = document.getElementById('confirmPassword');

    if (!passwordInput || !confirmInput) {
        return;
    }

    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    if (!password || password.length < 6) {
        alert('新しいパスワードは6文字以上にしてください。');
        return;
    }
    if (password !== confirmPassword) {
        alert('パスワードが一致しません。');
        return;
    }

    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (!sessionData?.session) {
        showMessage('resetResult', 'セッションが見つかりません。再度メールリンクからアクセスしてください。', true);
        return;
    }

    try {
        await updatePassword(password);
        showMessage('resetResult', '新しいパスワードが設定されました。ログインページに戻ってください。');
        document.getElementById('newPasswordForm').reset();
    } catch (error) {
        showMessage('resetResult', error.message, true);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await initPasswordResetPage();

    const resetRequestForm = document.getElementById('resetRequestForm');
    if (resetRequestForm) {
        resetRequestForm.addEventListener('submit', handleResetRequest);
    }

    const newPasswordForm = document.getElementById('newPasswordForm');
    if (newPasswordForm) {
        newPasswordForm.addEventListener('submit', handleNewPasswordSubmit);
    }
});
