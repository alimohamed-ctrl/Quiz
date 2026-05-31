const API_URL = "https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec";
let quizQuestions = [];
let timeLeft = 600; // 10 دقائق تعادل 600 ثانية
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) themeBtn.innerText = "☀️ وضع مضيء";
    }
    loadQuiz();
});

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const themeBtn = document.getElementById('themeBtn');
    
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeBtn) themeBtn.innerText = "🌙 وضع داكن";
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeBtn) themeBtn.innerText = "☀️ وضع مضيء";
        localStorage.setItem('theme', 'dark');
    }
}

// جلب الأسئلة وتشغيل التايمر
async function loadQuiz() {
    try {
        const response = await fetch(API_URL);
        quizQuestions = await response.json();
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('submit-btn').style.display = 'block';
        document.getElementById('quizHeader').style.display = 'block'; // إظهار التايمر بعد تحميل الأسئلة
        
        displayQuestions();
        startTimer(); // بدء العد التنازلي
    } catch (error) {
        document.getElementById('loading').innerText = "فشل استدعاء الاختبار، يرجى التحقق من اتصال الإنترنت وتحديث الصفحة.";
        console.error(error);
    }
}

// عرض الأسئلة مع إضافة حدث دالة الإنجاز المباشر
function displayQuestions() {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = "";
    
    quizQuestions.forEach((q, index) => {
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
}

// دالة تحديث شريط الإنجاز العلوي
function updateProgressBar() {
    let answeredCount = 0;
    quizQuestions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        if (selected) answeredCount++;
    });
    
    let percentage = quizQuestions.length > 0 ? Math.round((answeredCount / quizQuestions.length) * 100) : 0;
    document.getElementById('progressBarFill').style.width = `${percentage}%`;
    document.getElementById('progressPercent').innerText = `${percentage}%`;
}

// نظام تشغيل وإدارة الوقت التنازلي
function startTimer() {
    timerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("⏰ انتهى الوقت المحدد للاختبار (10 دقائق)! سيتم حفظ وإرسال إجاباتك الحالية تلقائياً.");
            submitQuiz(true); // الإرسال التلقائي الإجباري
        } else {
            timeLeft--;
            renderTimer();
        }
    }, 1000);
}

function renderTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timerText').innerText = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// معالجة التصحيح وعرض النتيجة
async function submitQuiz(isTimeOut = false) {
    // إيقاف العداد فوراً لمنع التكرار
    if (timerInterval) clearInterval(timerInterval);

    let empName = document.getElementById('employee-name').value.trim();
    if (!empName) { 
        empName = isTimeOut ? "موظف لم يكتب اسمه (انتهى وقته)" : "موظف لم يحدد الاسم";
        if (!isTimeOut) {
            alert("يرجى إدخال اسمك أولاً!"); 
            startTimer(); // إعادة تشغيل المؤقت لو ألغى الإرسال بسبب الاسم
            return; 
        }
    }
    
    if (!isTimeOut) {
        let answeredAll = true;
        quizQuestions.forEach((q, index) => {
            const selected = document.querySelector(`input[name="q${index}"]:checked`);
            if (!selected) answeredAll = false;
        });

        if (!answeredAll) {
            const confirmSubmit = confirm("لم تقم بحل جميع الأسئلة المطروحة، هل أنت متأكد من رغبتك في الإرسال؟");
            if (!confirmSubmit) {
                startTimer(); // تفعيل التايمر مجدداً في حال تراجع عن الإرسال
                return;
            }
        }
    }
    
    let score = 0;
    let detailsArray = [];
    
    quizQuestions.forEach((q, index) => {
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

    const finalResult = `${score} من ${quizQuestions.length}`;
    const reportDetails = detailsArray.join(" | ");
    
    // توجيه فوري للموظف لصفحة نتيجته الملونة
    showResultsPage(empName, score);
    
    // إرسال البيانات بشكل آمن ومخفي لجوجل شيت
    try {
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors", 
            body: JSON.stringify({ name: empName, score: finalResult, details: reportDetails })
        });
        console.log("تم تحديث شيت الإدارة بنجاح.");
    } catch (error) {
        console.error("فشل إرسال النسخة الخلفية للشيت:", error);
    }
}

// بناء لوحة التحكم ومراجعة الأسئلة
function showResultsPage(name, score) {
    document.getElementById('quiz-view').style.display = 'none';
    document.getElementById('result-view').style.display = 'block';
    
    document.getElementById('employee-greeting').innerText = `أهلاً بك يا ${name}، لقد أتممت الاختبار بنجاح وتم تسجيل النتيجة بمستندات الإدارة.`;
    
    let percentage = quizQuestions.length > 0 ? Math.round((score / quizQuestions.length) * 100) : 0;
    document.getElementById('percentageCircle').innerHTML = `${percentage}% <span>النسبة المئوية</span>`;
    document.getElementById('totalScoreText').innerText = `مجموع إجاباتك الصحيحة هو: ${score} من أصل ${quizQuestions.length} سؤال.`;
    
    const reviewContainer = document.getElementById('review-container');
    reviewContainer.innerHTML = "";
    
    quizQuestions.forEach((q, index) => {
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
