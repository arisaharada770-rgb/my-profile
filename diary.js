// パスワード設定
const ADMIN_PASSWORD = 'aridajo';

// 日記データの取得
function getDiaries() {
    const diariesJson = localStorage.getItem('diaries');
    return diariesJson ? JSON.parse(diariesJson) : [];
}

// 日記データの保存
function saveDiaries(diaries) {
    localStorage.setItem('diaries', JSON.stringify(diaries));
}

// コメント取得
function getComments(diaryId) {
    const commentsJson = localStorage.getItem(`comments-${diaryId}`);
    return commentsJson ? JSON.parse(commentsJson) : [];
}

// コメント保存
function saveComments(diaryId, comments) {
    localStorage.setItem(`comments-${diaryId}`, JSON.stringify(comments));
}

// パスワード検証
function verifyPassword(password) {
    return password === ADMIN_PASSWORD;
}

// 日記の追加
function addDiary(title, content, password) {
    if (!verifyPassword(password)) {
        alert('パスワードが間違っています');
        return false;
    }
    
    const diaries = getDiaries();
    const newDiary = {
        id: Date.now(),
        title: title,
        content: content,
        date: new Date().toLocaleString('ja-JP')
    };
    diaries.unshift(newDiary);
    saveDiaries(diaries);
    return true;
}

// 日記の削除
function deleteDiary(id) {
    const diaries = getDiaries();
    const filteredDiaries = diaries.filter(diary => diary.id !== id);
    saveDiaries(filteredDiaries);
    localStorage.removeItem(`comments-${id}`);
}

// コメントの追加
function addComment(diaryId, name, text) {
    const comments = getComments(diaryId);
    const newComment = {
        id: Date.now(),
        name: name || '名前なし',
        text: text,
        date: new Date().toLocaleString('ja-JP')
    };
    comments.push(newComment);
    saveComments(diaryId, comments);
}

// コメント削除（実装は簡易版）
function deleteComment(diaryId, commentId) {
    const comments = getComments(diaryId);
    const filteredComments = comments.filter(c => c.id !== commentId);
    saveComments(diaryId, filteredComments);
}

// 日記一覧の表示
function displayDiaries() {
    const diaries = getDiaries();
    const diaryList = document.getElementById('diaryList');
    
    if (diaries.length === 0) {
        diaryList.innerHTML = '<p class="empty-message">まだ日記がありません。書いてみましょう！</p>';
        return;
    }
    
    diaryList.innerHTML = diaries.map(diary => {
        const comments = getComments(diary.id);
        const commentsHtml = comments.map(comment => `
            <div class="diary-comment">
                <div class="diary-comment-name">${escapeHtml(comment.name)} - ${comment.date}</div>
                <div class="diary-comment-text">${escapeHtml(comment.text)}</div>
            </div>
        `).join('');
        
        return `
            <div class="diary-entry">
                <div class="diary-entry-meta">
                    <div class="diary-entry-date">${diary.date}</div>
                    <div class="diary-entry-title">${escapeHtml(diary.title)}</div>
                </div>
                <div class="diary-entry-content">${escapeHtml(diary.content)}</div>
                <button class="diary-entry-delete" onclick="handleDelete(${diary.id})">削除</button>
                
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
    return text.replace(/[&<>"']/g, m => map[m]);
}

// 削除処理
function handleDelete(id) {
    if (confirm('この日記を削除してもよろしいですか？')) {
        deleteDiary(id);
        displayDiaries();
    }
}

// コメント追加処理
function handleAddComment(event, diaryId) {
    event.preventDefault();
    
    const form = event.target;
    const nameInput = form.querySelector('.comment-name');
    const textInput = form.querySelector('.comment-text');
    
    const name = nameInput.value.trim();
    const text = textInput.value.trim();
    
    if (text) {
        addComment(diaryId, name, text);
        nameInput.value = '';
        textInput.value = '';
        displayDiaries();
    }
}

// フォーム送信の処理
document.getElementById('diaryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('diaryTitle').value.trim();
    const content = document.getElementById('diaryContent').value.trim();
    const password = document.getElementById('diaryPassword').value;
    
    if (title && content && password) {
        if (addDiary(title, content, password)) {
            document.getElementById('diaryForm').reset();
            displayDiaries();
        }
    }
});

// ページロード時に日記を表示
document.addEventListener('DOMContentLoaded', () => {
    displayDiaries();
});
