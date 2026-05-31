const API_URL = "https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec";
let quizQuestions = [];

// 1. تشغيل الإعدادات بأمان بعد تحميل واجهة الـ HTML بالكامل لمنع كراش السكريبت
document.addEventListener('DOMContentLoaded', () => {
    // التحقق من الوضع المفضل المخزن
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) themeBtn.innerText = "☀️ وضع مضيء";
    }
    // البدء في جلب الأسئلة
    loadQuiz();
});

// 2. دالة تبديل الوضع الليلي والنهاري بأمان
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

// 3. جلب الأسئلة من جوجل شيت
async function loadQuiz() {
    try {
        const response = await fetch(API_URL);
        quizQuestions = await response.json();
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('submit-btn').style.display = 'block';
        
        displayQuestions();
    } catch (error) {
        document.getElementById('loading').innerText = "فشل استدعاء الاختبار، يرجى التحقق من اتصال الإنترنت وتحديث الصفحة.";
        console.error(error);
    }
}

// 4. عرض الأسئلة في الواجهة
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
                        <input type="radio" name="q${index}" value="${cleanedOpt}">
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

// 5. معالجة التصحيح وعرض النتيجة فوراً وإرسال البيانات في الخلفية
async function submitQuiz() {
    const empName = document.getElementById('employee-name').value.trim();
    if (!empName) { alert("يرجى إدخال اسمك أولاً!"); return; }
    
    // التحقق من حل جميع الأسئلة
    let answeredAll = true;
    quizQuestions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        if (!selected) answeredAll = false;
    });

    if (!answeredAll) {
        const confirmSubmit = confirm("لم تقم بحل جميع الأسئلة المطروحة، هل أنت متأكد من رغبتك في الإرسال؟");
        if (!confirmSubmit) return;
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
    
    // [تحديث جوهري]: إظهار صفحة النتيجة فوراً للموظف لضمان تجربة مستخدم سريعة وبدون تعليق
    showResultsPage(empName, score);
    
    // إرسال البيانات لجوجل شيت هادئاً في الخلفية (تم إزالة الـ headers لحل مشكلة الـ CORS تماماً)
    try {
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors", 
            body: JSON.stringify({ name: empName, score: finalResult, details: reportDetails })
        });
        console.log("تم حفظ النتيجة في Google Sheets بنجاح.");
    } catch (error) {
        console.error("فشل إرسال النسخة الاحتياطية للشيت:", error);
    }
}

// 6. بناء شاشة التقييم النهائي وعرض الأسئلة ملونة
function showResultsPage(name, score) {
    document.getElementById('quiz-view').style.display = 'none';
    document.getElementById('result-view').style.display = 'block';
    
    document.getElementById('employee-greeting').innerText = `أهلاً بك يا ${name}، لقد أتممت الاختبار بنجاح وتم تسجيل النتيجة بمستندات الإدارة.`;
    
    // حساب النسبة المئوية بدقة
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
                    cssClass = "correct-opt"; // أخضر للإجابة الصحيحة
                } else if (cleanedOpt === userSelection && !isCorrect) {
                    cssClass = "wrong-opt"; // أحمر لإجابة الموظف الخاطئة
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
    
    // الصعود التلقائي لأعلى الصفحة لمشاهدة النتيجة مباشرة
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
