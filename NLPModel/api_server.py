from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from transformers import pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
import json
import os
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
# Get the directory where this script is located
import os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(SCRIPT_DIR, "nda_question_bank_520.csv")

questions_df = pd.read_csv(CSV_PATH)
print(f"✅ Loaded {len(questions_df)} questions from CSV")

########################################
# IN-MEMORY SESSION STORAGE
########################################
# Store interview sessions: { rfid: { questions: [], answers: [], scores: [], current_index: 0, asked_question_ids: set() } }
interview_sessions = {}

# Store results directory
RESULTS_DIR = os.path.join(SCRIPT_DIR, "interview_results")
if not os.path.exists(RESULTS_DIR):
    os.makedirs(RESULTS_DIR)
    print(f"✅ Created results directory: {RESULTS_DIR}")

########################################
# NLP EVALUATION FUNCTION
########################################
def evaluate_answer(answer, question):
    """
    Optimized NLP scoring using:
    - Sentiment analysis (30% weight)
    - TF-IDF relevance (70% weight)  
    - Length bonus for detailed answers
    Returns: (sentiment_score, relevance_score, final_score)
    """
    try:
        # Handle empty answers
        if not answer or len(answer.strip()) < 3:
            return 0.0, 0.0, 0.0

        # Clean answer
        answer = answer.strip()
        word_count = len(answer.split())
        
        # --- Sentiment Score ---
        try:
            sentiment = sentiment_model(answer[:512])[0]  # Truncate to model max length
            sentiment_label = sentiment["label"]
            sentiment_confidence = float(sentiment["score"])
            
            # Convert to score: POSITIVE = 0.5 to 1.0, NEGATIVE = 0.0 to 0.5
            if sentiment_label == "POSITIVE":
                sentiment_score = 0.5 + (sentiment_confidence * 0.5)  # 0.5 to 1.0
            else:
                sentiment_score = 0.5 - (sentiment_confidence * 0.5)  # 0.0 to 0.5
                
            print(f"  Sentiment: {sentiment_label} ({sentiment_confidence:.3f}) -> Score: {sentiment_score:.3f}")
        except Exception as e:
            print(f"  ⚠️ Sentiment error: {e}")
            sentiment_score = 0.5  # Neutral default

        # --- Relevance Score (TF-IDF cosine similarity) ---
        try:
            # Handle short inputs
            if len(question.split()) < 2 or len(answer.split()) < 2:
                relevance_score = 0.3  # Default low score for short answers
            else:
                tfidf = TfidfVectorizer(min_df=1, stop_words='english', max_features=100)
                vectors = tfidf.fit_transform([question, answer])
                
                # Convert sparse matrix to dense array for calculation
                question_vec = vectors[0].toarray().flatten()
                answer_vec = vectors[1].toarray().flatten()
                
                # Calculate cosine similarity
                from numpy.linalg import norm
                if norm(question_vec) > 0 and norm(answer_vec) > 0:
                    cosine_sim = (question_vec @ answer_vec) / (norm(question_vec) * norm(answer_vec))
                    relevance_score = float(cosine_sim)
                else:
                    relevance_score = 0.1
                
            print(f"  Relevance: {relevance_score:.3f}")
        except Exception as e:
            print(f"  ⚠️ Relevance error: {e}")
            relevance_score = 0.0

        # --- Final weighted score (0-10 scale) ---
        # Weighted combination: Sentiment 30%, Relevance 70% (relevance is more important)
        combined_score = (sentiment_score * 0.3) + (relevance_score * 0.7)
        
        # Apply length bonus: 10-30 words = +0.05, 30+ words = +0.1
        length_bonus = 0.0
        if word_count >= 30:
            length_bonus = 0.1
        elif word_count >= 10:
            length_bonus = 0.05
        
        combined_score = min(1.0, combined_score + length_bonus)
        
        # Scale to 0-10
        final_score = round(combined_score * 10, 2)
        
        print(f"  📊 Final Score: {final_score}/10 (Sentiment: {sentiment_score:.2f}, Relevance: {relevance_score:.2f}, Words: {word_count}, Bonus: +{length_bonus:.2f})")

        return float(sentiment_score), float(relevance_score), float(final_score)
    
    except Exception as e:
        print(f"❌ Error in evaluate_answer: {str(e)}")
        return 0.0, 0.0, 0.0

########################################
# API ENDPOINTS
########################################

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'service': 'NLPModel Question API',
        'total_questions': len(questions_df),
        'active_sessions': len(interview_sessions)
    }), 200

@app.route('/start-interview', methods=['POST'])
def start_interview():
    """
    Start a new interview session
    Expects: { rfid: string, roll_no: string, name: string }
    Returns: { success: bool, session_id: string, first_question: object }
    """
    try:
        data = request.json
        rfid = data.get('rfid')
        roll_no = data.get('roll_no')
        name = data.get('name', 'Candidate')

        if not rfid:
            return jsonify({'success': False, 'message': 'RFID is required'}), 400

        # Initialize interview session
        interview_sessions[rfid] = {
            'rfid': rfid,
            'roll_no': roll_no,
            'name': name,
            'start_time': datetime.now().isoformat(),
            'current_index': 0,
            'questions': [],
            'answers': [],
            'scores': [],
            'asked_question_ids': set([0]),  # Track asked questions, 0 for intro
            'total_questions': 10  # Fixed 10 questions per interview
        }

        # Get first question (Introduction)
        first_question = {
            'question_id': 0,
            'question_number': 1,
            'total_questions': 10,
            'category': 'Introduction',
            'question_text': 'Good Afternoon. Please introduce yourself and tell us about your background.'
        }

        interview_sessions[rfid]['questions'].append(first_question)

        print(f"✅ Interview started for RFID: {rfid}, Name: {name}")

        return jsonify({
            'success': True,
            'session_id': rfid,
            'question': first_question
        }), 200

    except Exception as e:
        print(f"Error in start_interview: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error starting interview: {str(e)}'
        }), 500

@app.route('/submit-answer', methods=['POST'])
def submit_answer():
    """
    Submit answer and get next question
    Expects: { rfid: string, answer: string, question_id: int }
    Returns: { success: bool, score: object, next_question: object, completed: bool }
    """
    try:
        data = request.json
        rfid = data.get('rfid')
        answer = data.get('answer', '')
        question_id = data.get('question_id')

        if not rfid or rfid not in interview_sessions:
            return jsonify({'success': False, 'message': 'Invalid session'}), 400

        session = interview_sessions[rfid]
        current_question = session['questions'][session['current_index']]

        print(f"\n📝 Evaluating answer for Q{session['current_index'] + 1}...")
        print(f"  Question: {current_question['question_text'][:50]}...")
        print(f"  Answer: {answer[:100]}...")

        # Evaluate the answer
        sentiment_score, relevance_score, final_score = evaluate_answer(
            answer, 
            current_question['question_text']
        )

        # Store answer and scores
        session['answers'].append({
            'question_id': current_question.get('question_id', question_id),
            'answer': answer,
            'sentiment_score': sentiment_score,
            'relevance_score': relevance_score,
            'final_score': final_score,
            'timestamp': datetime.now().isoformat()
        })

        session['scores'].append(final_score)
        session['current_index'] += 1

        print(f"📊 Score: {final_score}/10 | Total so far: {sum(session['scores']):.1f}")

        # Check if interview is complete (10 questions total)
        if session['current_index'] >= session['total_questions']:
            # Interview completed
            total_score = sum(session['scores'])
            avg_score = total_score / len(session['scores']) if session['scores'] else 0

            # Save results to file
            save_interview_results(rfid, session, total_score, avg_score)

            print(f"\n🎉 Interview completed! Total: {total_score:.1f}/100, Avg: {avg_score:.1f}/10")

            return jsonify({
                'success': True,
                'completed': True,
                'score': {
                    'question_score': final_score,
                    'total_score': round(total_score, 2),
                    'average_score': round(avg_score, 2),
                    'questions_answered': len(session['answers'])
                },
                'message': 'Interview completed successfully'
            }), 200

        # Get next question from CSV based on performance
        # Adaptive difficulty based on current score
        print(f"\n🎯 Selecting next question based on score: {final_score}/10")
        
        # Calculate average score so far
        avg_score_so_far = sum(session['scores']) / len(session['scores'])
        
        # Adaptive category selection
        if avg_score_so_far >= 6.5:
            # High performer - Hard questions
            category_filter = ['Mathematics', 'Science', 'Reasoning', 'Current Affairs']
            difficulty_level = "Hard"
        elif avg_score_so_far >= 4.0:
            # Medium performer - Mixed questions
            category_filter = ['General Knowledge', 'Current Affairs', 'Geography', 'Mathematics']
            difficulty_level = "Medium"
        else:
            # Needs support - Easy questions
            category_filter = ['Personality Test', 'English', 'General Knowledge']
            difficulty_level = "Easy"
        
        print(f"  Difficulty: {difficulty_level} | Categories: {category_filter}")

        # Filter available questions (not already asked)
        asked_ids = session['asked_question_ids']
        available_questions = questions_df[
            (questions_df['category'].isin(category_filter)) &
            (~questions_df['question_id'].isin(asked_ids))
        ]

        # If no questions available in preferred categories, use any unused question
        if len(available_questions) == 0:
            print("  ⚠️ No questions in preferred categories, selecting from all")
            available_questions = questions_df[~questions_df['question_id'].isin(asked_ids)]
        
        # If still no questions, fallback to any random question (shouldn't happen with 520 questions)
        if len(available_questions) == 0:
            print("  ⚠️ All questions exhausted, reusing questions")
            available_questions = questions_df

        # Select random question
        next_q = available_questions.sample(n=1).iloc[0]
        
        # Clean question text - remove any NaN, None, or undefined values
        question_text = str(next_q['question_text']).strip()
        if question_text.lower() in ['nan', 'none', 'undefined', '']:
            print("  ⚠️ Invalid question text detected, using fallback")
            question_text = "Please describe your answer."
        
        next_question = {
            'question_id': int(next_q['question_id']),
            'question_number': session['current_index'] + 1,
            'total_questions': session['total_questions'],
            'category': str(next_q['category']).strip(),
            'question_text': question_text
        }

        # Mark question as asked
        session['asked_question_ids'].add(int(next_q['question_id']))
        session['questions'].append(next_question)

        print(f"  Selected: Q{next_question['question_id']} - {next_question['category']}")
        print(f"  Text: {next_question['question_text']}")
        print(f"  Text length: {len(next_question['question_text'])} chars")

        return jsonify({
            'success': True,
            'completed': False,
            'score': {
                'question_score': final_score,
                'sentiment': sentiment_score,
                'relevance': relevance_score
            },
            'question': next_question
        }), 200

    except Exception as e:
        print(f"Error in submit_answer: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error processing answer: {str(e)}'
        }), 500

def save_interview_results(rfid, session, total_score, avg_score):
    """Save interview results to JSON file"""
    try:
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
            'questions_and_answers': []
        }

        # Combine questions and answers
        for i, question in enumerate(session['questions']):
            qa_pair = {
                'question_number': i + 1,
                'question_id': question.get('question_id', i),
                'category': question.get('category', 'N/A'),
                'question_text': question['question_text'],
                'answer': session['answers'][i]['answer'] if i < len(session['answers']) else '',
                'sentiment_score': session['answers'][i]['sentiment_score'] if i < len(session['answers']) else 0,
                'relevance_score': session['answers'][i]['relevance_score'] if i < len(session['answers']) else 0,
                'final_score': session['answers'][i]['final_score'] if i < len(session['answers']) else 0
            }
            result_data['questions_and_answers'].append(qa_pair)

        # Save to file
        filename = f"{RESULTS_DIR}/{rfid}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, indent=2, ensure_ascii=False)

        print(f"💾 Interview results saved: {filename}")
        
        # Clean up session from memory
        del interview_sessions[rfid]

    except Exception as e:
        print(f"Error saving results: {str(e)}")

@app.route('/get-session', methods=['GET'])
def get_session():
    """Get current session status"""
    rfid = request.args.get('rfid')
    
    if not rfid or rfid not in interview_sessions:
        return jsonify({'success': False, 'message': 'Session not found'}), 404
    
    session = interview_sessions[rfid]
    return jsonify({
        'success': True,
        'session': {
            'rfid': rfid,
            'current_question': session['current_index'] + 1,
            'total_questions': session['total_questions'],
            'questions_answered': len(session['answers']),
            'current_score': sum(session['scores'])
        }
    }), 200

########################################
# RUN SERVER
########################################
if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 NLPModel Question Delivery API")
    print("="*50)
    print("📍 Endpoint: POST http://localhost:6000/start-interview")
    print("📍 Endpoint: POST http://localhost:6000/submit-answer")
    print("📍 Health: GET http://localhost:6000/health")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=6000, debug=True)
