import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import asyncio
import edge_tts
import hashlib
import pandas as pd
import numpy as np
from transformers import pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from numpy.linalg import norm
import json
import os
import re
from datetime import datetime

app = Flask(__name__)
CORS(app)

########################################
# LOAD NLP MODELS
########################################
print("🔄 Loading NLP models...")
sentiment_model = pipeline("sentiment-analysis")
print("✅ Sentiment analysis model loaded")
print("✅ NLP models ready")

########################################
# LOAD QUESTION BANK
########################################
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(SCRIPT_DIR, "nda_question_bank_520.csv")

questions_df = pd.read_csv(CSV_PATH)
# Fill NaN in keywords and reference_answer columns
questions_df['keywords'] = questions_df['keywords'].fillna('')
questions_df['reference_answer'] = questions_df['reference_answer'].fillna('')
questions_df['difficulty'] = questions_df['difficulty'].fillna('medium')
questions_df['language'] = questions_df['language'].fillna('en')
print(f"✅ Loaded {len(questions_df)} questions from CSV")
print(f"   Categories: {questions_df['category'].nunique()} | Difficulties: {questions_df['difficulty'].value_counts().to_dict()}")

########################################
# IN-MEMORY SESSION STORAGE
########################################
interview_sessions = {}

RESULTS_DIR = os.path.join(SCRIPT_DIR, "interview_results")
if not os.path.exists(RESULTS_DIR):
    os.makedirs(RESULTS_DIR)
    print(f"✅ Created results directory: {RESULTS_DIR}")

TTS_DIR = os.path.join(SCRIPT_DIR, "tts_cache")
if not os.path.exists(TTS_DIR):
    os.makedirs(TTS_DIR)
    print(f"✅ Created TTS cache directory: {TTS_DIR}")

########################################
# ANSWER TONE ANALYSIS
########################################
TONE_CONFIDENT = "confident"
TONE_NERVOUS = "nervous"
TONE_EVASIVE = "evasive"
TONE_AGGRESSIVE = "aggressive"
TONE_NEUTRAL = "neutral"
TONE_THOUGHTFUL = "thoughtful"

def analyze_tone(answer, sentiment_result):
    """
    Analyze the behavioral tone of an answer.
    Returns: tone label and confidence score
    """
    answer_lower = answer.lower().strip()
    word_count = len(answer.split())
    
    # Evasive indicators: very short, non-committal phrases
    evasive_phrases = [
        "i don't know", "i am not sure", "not sure", "no idea", "can't say",
        "maybe", "perhaps", "i think so", "i guess", "possibly", "don't remember",
        "pass", "skip", "next question", "no comment"
    ]
    evasive_score = sum(1 for p in evasive_phrases if p in answer_lower)
    
    # Aggressive indicators: assertive/confrontational language
    aggressive_phrases = [
        "obviously", "clearly you", "everyone knows", "that's wrong",
        "stupid question", "ridiculous", "of course", "any fool", "basic question"
    ]
    aggressive_score = sum(1 for p in aggressive_phrases if p in answer_lower)
    
    # Confidence indicators: structured, assertive, detailed
    confident_phrases = [
        "i believe", "in my opinion", "based on my experience", "i am confident",
        "i would", "my approach would be", "i strongly feel", "from what i know",
        "i have experience", "i can contribute"
    ]
    confident_score = sum(1 for p in confident_phrases if p in answer_lower)
    
    # Thoughtful indicators: analytical, balanced
    thoughtful_phrases = [
        "on one hand", "on the other hand", "considering", "however",
        "furthermore", "in addition", "moreover", "while", "although",
        "the key factor", "it depends on", "there are multiple aspects"
    ]
    thoughtful_score = sum(1 for p in thoughtful_phrases if p in answer_lower)
    
    # Nervous indicators: hesitations, self-doubt
    nervous_phrases = [
        "sorry", "i'm not confident", "forgive me", "excuse me",
        "i might be wrong", "correct me if", "i hope", "please bear with"
    ]
    nervous_score = sum(1 for p in nervous_phrases if p in answer_lower)
    
    # Determine tone
    scores = {
        TONE_EVASIVE: evasive_score + (1 if word_count < 5 else 0),
        TONE_AGGRESSIVE: aggressive_score,
        TONE_CONFIDENT: confident_score + (1 if word_count >= 25 else 0),
        TONE_THOUGHTFUL: thoughtful_score + (1 if word_count >= 40 else 0),
        TONE_NERVOUS: nervous_score,
    }
    
    # Sentiment also influences tone
    if sentiment_result:
        label = sentiment_result.get("label", "NEUTRAL")
        conf = sentiment_result.get("score", 0.5)
        if label == "POSITIVE" and conf > 0.85:
            scores[TONE_CONFIDENT] += 1
        elif label == "NEGATIVE" and conf > 0.8:
            scores[TONE_NERVOUS] += 1
    
    max_tone = max(scores, key=scores.get)
    max_score = scores[max_tone]
    
    if max_score == 0:
        return TONE_NEUTRAL, 0.5
    
    return max_tone, min(1.0, max_score / 3.0)

########################################
# 4-SIGNAL NLP EVALUATION
########################################
def evaluate_answer(answer, question_text, keywords_str="", reference_answer=""):
    """
    Advanced 4-signal NLP scoring:
    - Keyword Match (35%): checks for expected keywords in the answer
    - Semantic Similarity (25%): TF-IDF cosine similarity vs reference answer
    - Completeness (20%): word count, sentence structure, detail level
    - Coherence/Sentiment (20%): sentiment confidence + fluency
    
    Returns: dict with all scores and tone analysis
    """
    try:
        if not answer or len(answer.strip()) < 3:
            return {
                "keyword_score": 0.0, "semantic_score": 0.0,
                "completeness_score": 0.0, "coherence_score": 0.0,
                "final_score": 0.0, "tone": TONE_EVASIVE, "tone_confidence": 1.0,
                "sentiment_label": "NEGATIVE", "sentiment_confidence": 0.0
            }

        answer = answer.strip()
        answer_lower = answer.lower()
        word_count = len(answer.split())
        sentence_count = max(1, len(re.split(r'[.!?]+', answer.strip())))
        
        # ═══ SIGNAL 1: KEYWORD MATCH (35%) ═══
        keyword_score = 0.0
        if keywords_str:
            keywords = [k.strip().lower() for k in keywords_str.split('|') if k.strip()]
            if keywords:
                matched = sum(1 for kw in keywords if kw in answer_lower)
                keyword_score = matched / len(keywords)
        else:
            keyword_score = 0.5  # neutral if no keywords defined
        
        print(f"  📌 Keyword Match: {keyword_score:.3f}")
        
        # ═══ SIGNAL 2: SEMANTIC SIMILARITY (25%) ═══
        semantic_score = 0.0
        compare_text = reference_answer if reference_answer else question_text
        try:
            if len(compare_text.split()) >= 2 and word_count >= 2:
                tfidf = TfidfVectorizer(min_df=1, stop_words='english', max_features=200)
                vectors = tfidf.fit_transform([compare_text, answer])
                q_vec = vectors[0].toarray().flatten()
                a_vec = vectors[1].toarray().flatten()
                if norm(q_vec) > 0 and norm(a_vec) > 0:
                    semantic_score = float((q_vec @ a_vec) / (norm(q_vec) * norm(a_vec)))
            else:
                semantic_score = 0.1
        except Exception as e:
            print(f"  ⚠️ Semantic error: {e}")
            semantic_score = 0.1
        
        print(f"  📊 Semantic Similarity: {semantic_score:.3f}")
        
        # ═══ SIGNAL 3: COMPLETENESS (20%) ═══
        completeness_score = 0.0
        if word_count >= 50:
            completeness_score = 1.0
        elif word_count >= 30:
            completeness_score = 0.8
        elif word_count >= 15:
            completeness_score = 0.6
        elif word_count >= 8:
            completeness_score = 0.4
        elif word_count >= 3:
            completeness_score = 0.2
        
        # Bonus for multiple sentences (shows structured thinking)
        if sentence_count >= 3:
            completeness_score = min(1.0, completeness_score + 0.1)
        
        print(f"  📝 Completeness: {completeness_score:.3f} (words: {word_count}, sentences: {sentence_count})")
        
        # ═══ SIGNAL 4: COHERENCE / SENTIMENT (20%) ═══
        coherence_score = 0.5  # default neutral
        sentiment_label = "NEUTRAL"
        sentiment_confidence = 0.5
        try:
            sentiment = sentiment_model(answer[:512])[0]
            sentiment_label = sentiment["label"]
            sentiment_confidence = float(sentiment["score"])
            
            if sentiment_label == "POSITIVE":
                coherence_score = 0.5 + (sentiment_confidence * 0.5)
            else:
                coherence_score = max(0.2, 0.5 - (sentiment_confidence * 0.3))
        except Exception as e:
            print(f"  ⚠️ Sentiment error: {e}")
        
        print(f"  🎭 Coherence: {coherence_score:.3f} ({sentiment_label} @ {sentiment_confidence:.2f})")
        
        # ═══ TONE ANALYSIS ═══
        tone, tone_confidence = analyze_tone(answer, {"label": sentiment_label, "score": sentiment_confidence})
        print(f"  🗣️  Tone: {tone} ({tone_confidence:.2f})")
        
        # ═══ FINAL WEIGHTED SCORE (0-10) ═══
        combined = (
            keyword_score * 0.35 +
            semantic_score * 0.25 +
            completeness_score * 0.20 +
            coherence_score * 0.20
        )
        final_score = round(min(10.0, combined * 10), 2)
        
        print(f"  🏆 Final Score: {final_score}/10")
        
        return {
            "keyword_score": round(keyword_score, 3),
            "semantic_score": round(semantic_score, 3),
            "completeness_score": round(completeness_score, 3),
            "coherence_score": round(coherence_score, 3),
            "final_score": final_score,
            "tone": tone,
            "tone_confidence": round(tone_confidence, 2),
            "sentiment_label": sentiment_label,
            "sentiment_confidence": round(sentiment_confidence, 3)
        }
    
    except Exception as e:
        print(f"❌ Error in evaluate_answer: {str(e)}")
        return {
            "keyword_score": 0.0, "semantic_score": 0.0,
            "completeness_score": 0.0, "coherence_score": 0.0,
            "final_score": 0.0, "tone": TONE_NEUTRAL, "tone_confidence": 0.0,
            "sentiment_label": "NEUTRAL", "sentiment_confidence": 0.0
        }

########################################
# BEHAVIOR-DRIVEN QUESTION SELECTOR
########################################
def select_next_question(session, eval_result):
    """
    Selects the next question based on:
    1. Answer tone/behavior (real interview style)
    2. Performance-driven difficulty progression
    3. Category diversity (no 2+ consecutive same category)
    4. Deduplication by text content
    """
    asked_ids = session['asked_question_ids']
    asked_texts = session.get('asked_question_texts', set())
    scores = session['scores']
    tone = eval_result['tone']
    last_score = eval_result['final_score']
    last_category = session['questions'][-1].get('category', '') if session['questions'] else ''
    
    # Calculate running stats
    avg_score = sum(scores) / len(scores) if scores else 5.0
    recent_scores = scores[-3:] if len(scores) >= 3 else scores
    recent_avg = sum(recent_scores) / len(recent_scores) if recent_scores else 5.0
    
    # ═══ STEP 1: Determine target difficulty based on performance ═══
    if recent_avg >= 7.0:
        target_difficulty = 'hard'
    elif recent_avg >= 4.5:
        target_difficulty = 'medium'
    else:
        target_difficulty = 'easy'
    
    # ═══ STEP 2: Adjust based on TONE (behavior-driven) ═══
    preferred_categories = None
    
    if tone == TONE_EVASIVE:
        # Candidate is dodging — probe with direct/factual questions
        preferred_categories = ['General Knowledge', 'Mathematics', 'Science', 'Reasoning']
        # Don't escalate difficulty when evasive
        if target_difficulty == 'hard':
            target_difficulty = 'medium'
        print(f"  🎯 Tone=EVASIVE → probing with factual Qs, difficulty capped at {target_difficulty}")
        
    elif tone == TONE_NERVOUS:
        # Candidate seems anxious — ease pressure with familiar/easier topics
        preferred_categories = ['Personality Test', 'English', 'General Knowledge']
        if target_difficulty == 'hard':
            target_difficulty = 'medium'
        elif target_difficulty == 'medium' and last_score < 4:
            target_difficulty = 'easy'
        print(f"  🎯 Tone=NERVOUS → supportive Qs, difficulty={target_difficulty}")
        
    elif tone == TONE_AGGRESSIVE:
        # Candidate is overconfident — challenge with harder questions
        target_difficulty = 'hard'
        preferred_categories = ['Reasoning', 'Current Affairs', 'Science']
        print(f"  🎯 Tone=AGGRESSIVE → challenging with hard Qs")
        
    elif tone == TONE_CONFIDENT:
        # Candidate is doing well — escalate naturally
        if last_score >= 6:
            if target_difficulty != 'hard':
                target_difficulty = 'hard' if target_difficulty == 'medium' else 'medium'
        print(f"  🎯 Tone=CONFIDENT → progressive difficulty={target_difficulty}")
        
    elif tone == TONE_THOUGHTFUL:
        # Candidate shows depth — give complex analytical questions
        preferred_categories = ['Current Affairs', 'Personality Test', 'Geography']
        if target_difficulty == 'easy':
            target_difficulty = 'medium'
        print(f"  🎯 Tone=THOUGHTFUL → analytical Qs, difficulty={target_difficulty}")
    
    else:
        print(f"  🎯 Tone=NEUTRAL → standard progression, difficulty={target_difficulty}")
    
    # ═══ STEP 3: Category diversity — avoid same category twice in a row ═══
    available = questions_df[~questions_df['question_id'].isin(asked_ids)].copy()
    
    # Filter by session language (en/hi)
    session_lang = session.get('language', 'en')
    lang_filtered = available[available['language'] == session_lang]
    if len(lang_filtered) > 0:
        available = lang_filtered
    
    # Remove questions with same text as already asked (deduplication)
    if asked_texts:
        available = available[~available['question_text'].isin(asked_texts)]
    
    # Try to avoid same category as last question
    if last_category:
        different_category = available[available['category'] != last_category]
        if len(different_category) > 0:
            available = different_category
    
    # ═══ STEP 4: Filter by preferred categories + difficulty ═══
    candidates = available.copy()
    
    # Apply category preference if set
    if preferred_categories:
        cat_filtered = candidates[candidates['category'].isin(preferred_categories)]
        if len(cat_filtered) > 0:
            candidates = cat_filtered
    
    # Apply difficulty filter
    diff_filtered = candidates[candidates['difficulty'] == target_difficulty]
    if len(diff_filtered) > 0:
        candidates = diff_filtered
    else:
        # Fallback: try adjacent difficulty
        fallback_diffs = {
            'hard': ['medium', 'easy'],
            'medium': ['easy', 'hard'],
            'easy': ['medium', 'hard']
        }
        for fb_diff in fallback_diffs.get(target_difficulty, []):
            fb_filtered = candidates[candidates['difficulty'] == fb_diff]
            if len(fb_filtered) > 0:
                candidates = fb_filtered
                break
    
    # ═══ STEP 5: Final fallback ═══
    if len(candidates) == 0:
        # Fallback: try all unasked questions in same language
        fallback = questions_df[~questions_df['question_id'].isin(asked_ids)]
        lang_fb = fallback[fallback['language'] == session.get('language', 'en')]
        candidates = lang_fb if len(lang_fb) > 0 else fallback
    if len(candidates) == 0:
        candidates = questions_df  # absolute last resort
    
    # ═══ STEP 6: Pick a random question from filtered set ═══
    selected = candidates.sample(n=1).iloc[0]
    
    question_text = str(selected['question_text']).strip()
    if question_text.lower() in ['nan', 'none', '']:
        question_text = "Please elaborate on that topic."
    
    question = {
        'question_id': int(selected['question_id']),
        'question_number': session['current_index'] + 1,
        'total_questions': session['total_questions'],
        'category': str(selected['category']).strip(),
        'difficulty': str(selected.get('difficulty', 'medium')).strip(),
        'question_text': question_text
    }
    
    # Track asked questions
    session['asked_question_ids'].add(int(selected['question_id']))
    session.setdefault('asked_question_texts', set()).add(question_text)
    session['questions'].append(question)
    
    # Store keywords and reference for scoring the next answer
    session['current_keywords'] = str(selected.get('keywords', ''))
    session['current_reference'] = str(selected.get('reference_answer', ''))
    
    print(f"  ✅ Selected: [{question['difficulty'].upper()}] {question['category']} — Q{question['question_id']}")
    print(f"  📝 {question['question_text'][:80]}...")
    
    return question

########################################
# API ENDPOINTS
########################################

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'OK',
        'service': 'NiyuktiSetu NLP Interview Engine v2.0',
        'total_questions': len(questions_df),
        'categories': int(questions_df['category'].nunique()),
        'difficulty_distribution': questions_df['difficulty'].value_counts().to_dict(),
        'active_sessions': len(interview_sessions),
        'features': ['4-signal-scoring', 'behavior-driven-orchestration', 'tone-analysis']
    }), 200

@app.route('/start-interview', methods=['POST'])
def start_interview():
    try:
        data = request.json
        rfid = data.get('rfid')
        roll_no = data.get('roll_no')
        name = data.get('name', 'Candidate')
        language = data.get('language', 'en')  # 'en' or 'hi'

        if not rfid:
            return jsonify({'success': False, 'message': 'RFID is required'}), 400

        # Initialize session
        interview_sessions[rfid] = {
            'rfid': rfid,
            'roll_no': roll_no,
            'name': name,
            'language': language,
            'start_time': datetime.now().isoformat(),
            'current_index': 0,
            'questions': [],
            'answers': [],
            'scores': [],
            'tones': [],
            'asked_question_ids': set([0]),
            'asked_question_texts': set(),
            'total_questions': 10,
            'current_keywords': '',
            'current_reference': ''
        }

        if language == 'hi':
            first_question = {
                'question_id': 0,
                'question_number': 1,
                'total_questions': 10,
                'category': 'Introduction',
                'difficulty': 'easy',
                'question_text': 'नमस्कार। कृपया अपना परिचय दें — आपका नाम, शैक्षिक पृष्ठभूमि, परिवार, और आप सशस्त्र बलों में क्यों शामिल होना चाहते हैं।'
            }
            interview_sessions[rfid]['current_keywords'] = 'नाम|शिक्षा|परिवार|सशस्त्र बल|प्रेरणा|सेवा|भारत|name|education|family|armed forces|motivation|serve|india'
            interview_sessions[rfid]['current_reference'] = 'एक अच्छा परिचय व्यक्तिगत पहचान, शैक्षिक पृष्ठभूमि, पारिवारिक मूल्यों और रक्षा सेवाओं में शामिल होने की प्रेरणा को शामिल करता है।'
        else:
            first_question = {
                'question_id': 0,
                'question_number': 1,
                'total_questions': 10,
                'category': 'Introduction',
                'difficulty': 'easy',
                'question_text': 'Good afternoon. Please introduce yourself — your name, educational background, family, and why you wish to join the Armed Forces.'
            }
            interview_sessions[rfid]['current_keywords'] = 'name|education|family|armed forces|motivation|serve|india'
            interview_sessions[rfid]['current_reference'] = 'A good introduction covers personal identity, educational background, family values, and genuine motivation for joining the defence services.'

        interview_sessions[rfid]['questions'].append(first_question)

        print(f"✅ Interview started for: {name} ({rfid})")

        return jsonify({
            'success': True,
            'session_id': rfid,
            'question': first_question
        }), 200

    except Exception as e:
        print(f"Error in start_interview: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route('/submit-answer', methods=['POST'])
def submit_answer():
    try:
        data = request.json
        rfid = data.get('rfid')
        answer = data.get('answer', '')
        question_id = data.get('question_id')

        if not rfid or rfid not in interview_sessions:
            return jsonify({'success': False, 'message': 'Invalid session'}), 400

        session = interview_sessions[rfid]
        current_question = session['questions'][session['current_index']]

        print(f"\n{'='*60}")
        print(f"📝 Q{session['current_index'] + 1}: {current_question['question_text'][:60]}...")
        print(f"💬 Answer: {answer[:120]}...")
        print(f"{'='*60}")

        # Evaluate with 4-signal scoring
        eval_result = evaluate_answer(
            answer,
            current_question['question_text'],
            session.get('current_keywords', ''),
            session.get('current_reference', '')
        )

        # Store results
        session['answers'].append({
            'question_id': current_question.get('question_id', question_id),
            'category': current_question.get('category', ''),
            'difficulty': current_question.get('difficulty', 'medium'),
            'answer': answer,
            'keyword_score': eval_result['keyword_score'],
            'semantic_score': eval_result['semantic_score'],
            'completeness_score': eval_result['completeness_score'],
            'coherence_score': eval_result['coherence_score'],
            'final_score': eval_result['final_score'],
            'tone': eval_result['tone'],
            'tone_confidence': eval_result['tone_confidence'],
            'timestamp': datetime.now().isoformat()
        })

        session['scores'].append(eval_result['final_score'])
        session['tones'].append(eval_result['tone'])
        session['current_index'] += 1

        # Check if interview is complete
        if session['current_index'] >= session['total_questions']:
            total_score = sum(session['scores'])
            avg_score = total_score / len(session['scores'])
            
            # Determine overall tone pattern
            tone_counts = {}
            for t in session['tones']:
                tone_counts[t] = tone_counts.get(t, 0) + 1
            dominant_tone = max(tone_counts, key=tone_counts.get)

            save_interview_results(rfid, session, total_score, avg_score)

            print(f"\n🎉 Interview COMPLETE | Total: {total_score:.1f}/100 | Avg: {avg_score:.1f}/10 | Dominant tone: {dominant_tone}")

            return jsonify({
                'success': True,
                'completed': True,
                'score': {
                    'question_score': eval_result['final_score'],
                    'total_score': round(total_score, 2),
                    'average_score': round(avg_score, 2),
                    'questions_answered': len(session['answers']),
                    'dominant_tone': dominant_tone
                },
                'message': 'Interview completed successfully'
            }), 200

        # ═══ SELECT NEXT QUESTION (behavior-driven) ═══
        print(f"\n🎯 Selecting Q{session['current_index'] + 1} based on tone={eval_result['tone']}, score={eval_result['final_score']}")
        next_question = select_next_question(session, eval_result)

        return jsonify({
            'success': True,
            'completed': False,
            'score': {
                'question_score': eval_result['final_score'],
                'keyword_match': eval_result['keyword_score'],
                'semantic_similarity': eval_result['semantic_score'],
                'completeness': eval_result['completeness_score'],
                'coherence': eval_result['coherence_score'],
                'tone': eval_result['tone']
            },
            'question': next_question
        }), 200

    except Exception as e:
        print(f"Error in submit_answer: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

def save_interview_results(rfid, session, total_score, avg_score):
    try:
        tone_counts = {}
        for t in session.get('tones', []):
            tone_counts[t] = tone_counts.get(t, 0) + 1
        
        result_data = {
            'rfid': rfid,
            'roll_no': session['roll_no'],
            'name': session['name'],
            'start_time': session['start_time'],
            'end_time': datetime.now().isoformat(),
            'total_questions': len(session['questions']),
            'questions_answered': len(session['answers']),
            'total_score': round(total_score, 2),
            'average_score': round(avg_score, 2),
            'tone_summary': tone_counts,
            'questions_and_answers': []
        }

        for i, question in enumerate(session['questions']):
            qa = {
                'question_number': i + 1,
                'question_id': question.get('question_id', i),
                'category': question.get('category', 'N/A'),
                'difficulty': question.get('difficulty', 'N/A'),
                'question_text': question['question_text'],
            }
            if i < len(session['answers']):
                a = session['answers'][i]
                qa.update({
                    'answer': a['answer'],
                    'keyword_score': a['keyword_score'],
                    'semantic_score': a['semantic_score'],
                    'completeness_score': a['completeness_score'],
                    'coherence_score': a['coherence_score'],
                    'final_score': a['final_score'],
                    'tone': a['tone']
                })
            result_data['questions_and_answers'].append(qa)

        filename = f"{RESULTS_DIR}/{rfid}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, indent=2, ensure_ascii=False)

        print(f"💾 Results saved: {filename}")
        del interview_sessions[rfid]

    except Exception as e:
        print(f"Error saving results: {str(e)}")

@app.route('/get-session', methods=['GET'])
def get_session():
    rfid = request.args.get('rfid')
    if not rfid or rfid not in interview_sessions:
        return jsonify({'success': False, 'message': 'Session not found'}), 404
    
    session = interview_sessions[rfid]
    return jsonify({
        'success': True,
        'session': {
            'rfid': rfid,
            'name': session['name'],
            'current_question': session['current_index'] + 1,
            'total_questions': session['total_questions'],
            'questions_answered': len(session['answers']),
            'current_score': round(sum(session['scores']), 2),
            'average_score': round(sum(session['scores']) / len(session['scores']), 2) if session['scores'] else 0,
            'tone_history': session.get('tones', [])
        }
    }), 200

########################################
# TTS ENDPOINT (Azure Neural Voice via edge-tts)
########################################

# Voice mapping: natural Indian voices
TTS_VOICES = {
    'hi': 'hi-IN-SwaraNeural',              # Hindi female — very natural
    'en': 'en-IN-NeerjaExpressiveNeural',    # Indian English female — most natural, expressive
}

@app.route('/tts', methods=['POST'])
def text_to_speech():
    try:
        data = request.json
        text = data.get('text', '')
        lang = data.get('language', 'en')

        if not text:
            return jsonify({'success': False, 'message': 'No text provided'}), 400

        # Cache by text hash to avoid regenerating
        text_hash = hashlib.md5(f"{text}_{lang}".encode()).hexdigest()
        audio_path = os.path.join(TTS_DIR, f"{text_hash}.mp3")

        if not os.path.exists(audio_path):
            voice = TTS_VOICES.get(lang, TTS_VOICES['en'])
            # Run edge-tts async in sync Flask context
            async def generate():
                communicate = edge_tts.Communicate(text, voice, rate='-10%', pitch='-5Hz')
                await communicate.save(audio_path)
            asyncio.run(generate())
            print(f"🔊 TTS generated: [{lang}] {voice} → {text_hash}.mp3")
        else:
            print(f"🔊 TTS cache hit: {text_hash}.mp3")

        return send_file(audio_path, mimetype='audio/mpeg')
    except Exception as e:
        print(f"❌ TTS error: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

########################################
# RUN SERVER
########################################
if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 NiyuktiSetu NLP Interview Engine v2.0")
    print("="*60)
    print("📊 Scoring: 4-signal (keyword, semantic, completeness, coherence)")
    print("🧠 Orchestration: behavior-driven (tone-adaptive)")
    print(f"📚 Questions: {len(questions_df)} across {questions_df['category'].nunique()} categories")
    print("="*60)
    print("📍 POST http://localhost:6000/start-interview")
    print("📍 POST http://localhost:6000/submit-answer")
    print("📍 POST http://localhost:6000/tts")
    print("📍 GET  http://localhost:6000/health")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=6000, debug=True)
