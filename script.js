const API_URL = "https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec";
let allQuestionsRaw = [];
let todayQuestions = [];
let timeLeft = 600; // 10 دقائق تعادل 600 ثانية
let timerInterval = null;
let employeeName = "";

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeBtn').innerText = "☀️ وضع مضيء";
    }
    // سحب الأسئلة فوراً عند فتح الصفحة بالخلفية لتكون جاهزة
    preloadQuizData();
});

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const themeBtn = document.getElementById('themeBtn');
    
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeBtn.innerText = "🌙 وضع داكن";
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeBtn.innerText = "☀️ وضع مضيء";
        localStorage.setItem('theme', 'dark');
    }
}

async function preloadQuizData() {
    try {
        const response = await fetch(API_URL);
        allQuestionsRaw = await response.json();
        document.getElementById('server-status').innerText = "🟢 تم الاتصال بالسيرفر والأسئلة جاهزة للبدء.";
        document.getElementById('server-status').style.color = "#22c55e";
    } catch (error) {
        document.getElementById('server-status').innerText = "🔴 فشل الاتصال بالسيرفر، يرجى إعادة تحديث الصفحة.";
        document.getElementById('server-status').style.color = "#ef4444";
        console.error(error);
    }
}

// دالة البدء عند ضغط الموظف على الزرار بالترتيب الصحيح
function startQuiz() {
    const nameInput = document.getElementById('employee-name').value.trim();
    
    // 1. التحقق من كتابة الاسم
    if (!nameInput) {
        alert("تنبيه إدارة مران: يرجى كتابة اسمك الكامل أولاً قبل بدء الاختبار!");
        return;
    }
    
    // 2. التحقق من انتهاء تحميل البيانات من السيرفر
    if (allQuestionsRaw.length === 0) {
        alert("جاري تحميل حزمة الاختبار من السيرفر، يرجى الانتظار ثانيتين ثم الضغط مجدداً.");
        return;
    }
    
    employeeName = nameInput;

    // 3. جلب تاريخ اليوم بصيغة سنة-شهر-يوم (YYYY-MM-DD)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0'); // الشهور تبدأ من 0
    const dd = String(now.getDate()).padStart(2, '0');
    const todayString = `${yyyy}-${mm}-${dd}`; // التنسيق المطلوب: سنة-شهر-يوم

    // 4. فلترة أسئلة الشيت بناءً على تاريخ اليوم الحالي
    todayQuestions = allQuestionsRaw.filter(q => q.date && q.date.toString().trim() === todayString);

    // 5. تبديل الواجهات وإظهار الأسئلة والتايمر
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('quiz-view').style.display = 'block';

    if (todayQuestions.length === 0) {
        document.getElementById('quiz-container').innerHTML = `
            <div style="text-align:center; color:var(--danger); font-weight:700; padding:20px; background:rgba(239,68,68,0.05); border-radius:8px; border:1px solid var(--danger);">
                ⚠️ لا توجد أسئلة مخصصة لتاريخ اليوم (${todayString}) في ملف الإدارة! 
                <br><small style="font-weight:400; color:var(--text-muted)">يرجى التأكد من كتابة التاريخ في عمود التاريخ بالشيت بصيغة سنة-شهر-يوم (مثال: 2026-05-31).</small>
            </div>`;
        document.getElementById('submit-btn').style.display = 'none';
        document.getElementById('quizHeader').style.display = 'none';
    } else {
        displayQuestions();
        startTimer(); // بدء الـ 10 دقائق الآن بالظبط
    }
}

function displayQuestions() {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = "";
    
    todayQuestions.forEach((q, index) => {
        let optionsHTML = "";
        q.options.forEach(opt => {
            let cleanedOpt = opt.trim();
            if (cleanedOpt) {
                optionsHTML += `
                    <label class="option-label">
                        <input type="radio" name="q${index}" value="${cleanedOpt}" onchange="updateProgressBar()">
                        <span>${cleanedOpt}</span>
                    </label>
                `;
            }
        });
        
        quizContainer.innerHTML += `
            <div class="question-block">
                <div style="font-weight:600; margin-bottom:12px;">سؤال ${index + 1}: ${q.question}</div>
                ${optionsHTML}
            </div>
        `;
    });
    updateProgressBar();
}

function updateProgressBar() {
    let answeredCount = 0;
    todayQuestions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        if (selected) answeredCount++;
    });
    
    let percentage = todayQuestions.length > 0 ? Math.round((answeredCount / todayQuestions.length) * 100) : 0;
    document.getElementById('progressBarFill').style.width = `${percentage}%`;
    document.getElementById('progressPercent').innerText = `${percentage}%`;
}

function startTimer() {
    renderTimer();
    timerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("⏰ انتهى وقت الاختبار المحدد! سيتم إرسال إجاباتك الحالية تلقائياً للإدارة.");
            submitQuiz(true);
        } else {
            timeLeft--;
            renderTimer();
        }
    }, 1000);
}

function renderTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timerText').innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function submitQuiz(isTimeOut = false) {
    if (timerInterval) clearInterval(timerInterval);

    if (!isTimeOut) {
        let answeredAll = true;
        todayQuestions.forEach((q, index) => {
            const selected = document.querySelector(`input[name="q${index}"]:checked`);
            if (!selected) answeredAll = false;
        });

        if (!answeredAll) {
            const confirmSubmit = confirm("تنبيه: لم تحل كافة الأسئلة، هل تود إرسال ورقتك وإنهاء الوقت؟");
            if (!confirmSubmit) {
                startTimer();
                return;
            }
        }
    }
    
    let score = 0;
    let detailsArray = [];
    
    todayQuestions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        let qNum = index + 1;
        
        if (!selected) {
            detailsArray.push(`س${qNum}: لم يحل`);
        } else {
            let isCorrect = selected.value === q.answer.toString().trim();
            if (isCorrect) {
                score++;
                detailsArray.push(`س${qNum}: صح`);
            } else {
                detailsArray.push(`س${qNum}: خطأ`);
            }
        }
    });

    const finalResult = `${score} من ${todayQuestions.length}`;
    const reportDetails = detailsArray.join(" | ");
    
    showResultsPage(employeeName, score);
    
    try {
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors", 
            body: JSON.stringify({ name: employeeName, score: finalResult, details: reportDetails })
        });
    } catch (error) {
        console.error("عطل إرسال السجلات:", error);
    }
}

function showResultsPage(name, score) {
    document.getElementById('quiz-view').style.display = 'none';
    document.getElementById('result-view').style.display = 'block';
    
    document.getElementById('employee-greeting').innerText = `أهلاً بك يا ${name}، لقد أتممت الاختبار بنجاح وتم تسجيل النتيجة بمستندات الإدارة.`;
    
    let percentage = todayQuestions.length > 0 ? Math.round((score / todayQuestions.length) * 100) : 0;
    document.getElementById('percentageCircle').innerHTML = `${percentage}% <span>النسبة المئوية</span>`;
    document.getElementById('totalScoreText').innerText = `مجموع إجاباتك الصحيحة هو: ${score} من أصل ${todayQuestions.length} سؤال.`;
    
    const reviewContainer = document.getElementById('review-container');
    reviewContainer.innerHTML = "";
    
    todayQuestions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        let userSelection = selected ? selected.value : "لم تقم باختيار إجابة";
        let correctAnswer = q.answer ? q.answer.toString().trim() : "";
        let isCorrect = userSelection === correctAnswer;
        
        let optionsHTML = "";
        if (q.options && Array.isArray(q.options)) {
            q.options.forEach(opt => {
                let cleanedOpt = opt.trim();
                let cssClass = "";
                
                if (cleanedOpt === correctAnswer) {
                    cssClass = "correct-opt";
                } else if (cleanedOpt === userSelection && !isCorrect) {
                    cssClass = "wrong-opt";
                }
                
                if (cleanedOpt) {
                    optionsHTML += `
                        <div class="option-label ${cssClass}">
                            <input type="radio" disabled ${cleanedOpt === userSelection ? 'checked' : ''}>
                            <span>${cleanedOpt}</span>
                        </div>
                    `;
                }
            });
        }
        
        let feedback = isCorrect 
            ? `<div class="feedback-text text-success">✓ إجابة ممتازة، صحيحة!</div>`
            : `<div class="feedback-text text-danger">✗ إجابة خاطئة! الإجابة الصحيحة هي: ${correctAnswer}</div>`;
            
        reviewContainer.innerHTML += `
            <div class="question-block" style="border-right-color: ${isCorrect ? 'var(--success)' : 'var(--danger)'}">
                <div style="font-weight:600; margin-bottom:12px;">سؤال ${index + 1}: ${q.question}</div>
                ${optionsHTML}
                ${feedback}
            </div>
        `;
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
