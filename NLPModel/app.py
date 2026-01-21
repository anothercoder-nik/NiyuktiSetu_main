import pandas as pd
from transformers import pipeline
from sklearn.feature_extraction.text import TfidfVectorizer

########################################
# LOAD NLP MODELS
########################################

sentiment_model = pipeline("sentiment-analysis")
embedding_model = pipeline("feature-extraction", model="distilbert-base-uncased")

########################################
# NLP EVALUATION FUNCTION
########################################

def evaluate_answer(answer, question):
    """
    Performs NLP scoring using DistilBERT & sentiment analysis
    """

    # --- Sentiment Score ---
    sentiment = sentiment_model(answer)[0]
    sentiment_label = sentiment["label"]
    sentiment_score = sentiment["score"]

    # Convert positive/negative to + / -
    sentiment_score = sentiment_score if sentiment_label == "POSITIVE" else -sentiment_score

    # --- Relevance Score (TF-IDF cosine similarity) ---
    tfidf = TfidfVectorizer()
    vectors = tfidf.fit_transform([question, answer])
    relevance_score = (vectors[0] @ vectors[1].T).A[0][0]

    # --- Final weighted score ---
    final_score = (sentiment_score * 0.4) + (relevance_score * 0.6)

    return sentiment_score, relevance_score, final_score


########################################
# START INTERVIEW
########################################

def start_interview():
    print("\n🟢 NiyuktiSetu AI Interview Started")
    print("You will be asked introduction + NDA style questions.\n")

    # Load question CSV
    questions_df = pd.read_csv("nda_question_bank_520.csv")

    results = []  # store output

    # 1st question (manual)
    first_question = "Introduce yourself."
    print("\nQ1) " + first_question)
    answer = input("Your Answer: ")

    s_score, r_score, f_score = evaluate_answer(answer, first_question)

    results.append(["Introduce yourself", answer, s_score, r_score, f_score])

    # Loop through CSV questions
    for idx, row in questions_df.iterrows():

        question = row["question_text"]
        print(f"\nQ{idx+2}) {question}")
        answer = input("Your Answer: ")

        sentiment_score, relevance_score, final_score = evaluate_answer(answer, question)

        results.append([question, answer, sentiment_score, relevance_score, final_score])

    # Save interview results
    df = pd.DataFrame(results, columns=[
        "Question", "Answer", "Sentiment Score", "Relevance Score", "Final Evaluation Score"
    ])

    df.to_csv("interview_results.csv", index=False)

    print("\n✅ Interview Finished!")
    print("📄 Results saved to: interview_results.csv")


########################################
# RUN INTERVIEW
########################################

start_interview()