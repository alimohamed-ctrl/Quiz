const API_URL = "https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec";
let quizQuestions = [];

// 1. نظام تبديل الوضع الليلي والنهاري وحفظ الخيار بذاكرة المتصفح
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.getElementById('themeBtn').innerText = "🌙 وضع داكن";
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeBtn').innerText = "☀️ وضع مضيء";
        localStorage.setItem('theme', 'dark');
    }
}

// استعادة وضع المستخدم المفضل عند فتح الموقع تلقائياً
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeBtn').innerText = "☀️ وضع مضيء";
}

// 2. جلب الأسئلة من جوجل شيت
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

// 3. بناء وعرض الأسئلة بالاختيارات
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

// 4. معالجة التصحيح وإرسال النتيجة ثم فتح شاشة النتائج والمراجعة الملونة
async function submitQuiz() {
    const empName = document.getElementById('employee-name').value.trim();
    if (!empName) { alert("يرجى إدخال اسمك أولاً!"); return; }
    
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
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerText = "جاري حفظ إجاباتك بنجاح...";
    submitBtn.disabled = true;

    try {
        // إرسال البيانات لجوجل شيت أولاً بالخلفية
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: empName, score: finalResult, details: reportDetails })
        });
        
        // الانتقال الفوري لصفحة النتيجة بعد نجاح الإرسال
        showResultsPage(empName, score);
        
    } catch (error) {
        alert("حدث عطل غير متوقع أثناء إرسال البيانات، يرجى إعادة المحاولة.");
        submitBtn.innerText = "إنهاء الاختبار وإرسال الإجابات";
        submitBtn.disabled = false;
    }
}

// 5. وظيفة إظهار شاشة التقييم النهائي وبناء هيكل الأسئلة الملونة
function showResultsPage(name, score) {
    // إخفاء واجهة الامتحانات وإظهار واجهة النتيجة
    document.getElementById('quiz-view').style.display = 'none';
    document.getElementById('result-view').style.display = 'block';
    
    document.getElementById('employee-greeting').innerText = `أهلاً بك يا ${name}، لقد أتممت الاختبار بنجاح وتم تسجيل النتيجة بمستندات الإدارة.`;
    
    // حساب النسبة المئوية
    let percentage = Math.round((score / quizQuestions.length) * 100);
    document.getElementById('percentageCircle').innerHTML = `${percentage}% <span>النسبة المئوية</span>`;
    document.getElementById('totalScoreText').innerText = `مجموع إجاباتك الصحيحة هو: ${score} من أصل ${quizQuestions.length} سؤال.`;
    
    // بناء مراجعة الأسئلة الصح والخطأ بالوان الـ CSS
    const reviewContainer = document.getElementById('review-container');
    reviewContainer.innerHTML = "";
    
    quizQuestions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        let userSelection = selected ? selected.value : "لم تقم باختيار إجابة";
        let correctAnswer = q.answer.toString().trim();
        let isCorrect = userSelection === correctAnswer;
        
        let optionsHTML = "";
        q.options.forEach(opt => {
            let cleanedOpt = opt.trim();
            let cssClass = "";
            
            // تلوين الاختيارات بناء على دقة الموظف
            if (cleanedOpt === correctAnswer) {
                cssClass = "correct-opt"; // الإجابة الصح دائماً أخضر
            } else if (cleanedOpt === userSelection && !isCorrect) {
                cssClass = "wrong-opt"; // إجابة المستخدم الغلط أحمر
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
    
    // الصعود لأعلى الصفحة لرؤية النتيجة
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.onload = loadQuiz;
