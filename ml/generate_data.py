import random
import numpy as np
import pandas as pd

NUM_STUDENTS = 5000

student_profiles = [
    ("fast", 0.20),
    ("steady", 0.35),
    ("careful", 0.20),
    ("struggling", 0.20),
    ("gifted", 0.05),
]

profile_names = [p[0] for p in student_profiles]
weights = [p[1] for p in student_profiles]


def clamp(x, low, high):
    return max(low, min(high, x))


rows = []

for _ in range(NUM_STUDENTS):

    profile = random.choices(profile_names, weights=weights)[0]

    # Current planet (difficulty increases farther from the Sun)
    planet = random.randint(1, 9)

    if profile == "gifted":
        accuracy = random.uniform(94, 100)
        avg_time = random.uniform(1.5, 3.5)
        hints = random.randint(0, 1)
        retries = random.randint(0, 1)
        improvement = random.uniform(5, 12)
        consistency = random.uniform(92, 100)

    elif profile == "fast":
        accuracy = random.uniform(85, 97)
        avg_time = random.uniform(2, 5)
        hints = random.randint(0, 2)
        retries = random.randint(0, 2)
        improvement = random.uniform(2, 8)
        consistency = random.uniform(75, 95)

    elif profile == "steady":
        accuracy = random.uniform(70, 90)
        avg_time = random.uniform(4, 8)
        hints = random.randint(1, 3)
        retries = random.randint(1, 3)
        improvement = random.uniform(1, 7)
        consistency = random.uniform(70, 90)

    elif profile == "careful":
        accuracy = random.uniform(80, 94)
        avg_time = random.uniform(8, 15)
        hints = random.randint(0, 2)
        retries = random.randint(0, 2)
        improvement = random.uniform(0, 5)
        consistency = random.uniform(82, 98)

    else:
        accuracy = random.uniform(35, 70)
        avg_time = random.uniform(8, 18)
        hints = random.randint(3, 6)
        retries = random.randint(2, 5)
        improvement = random.uniform(-5, 5)
        consistency = random.uniform(40, 75)

    # Make later planets slightly harder
    accuracy -= (planet - 1) * random.uniform(0.5, 1.5)
    avg_time += (planet - 1) * random.uniform(0.1, 0.4)

    accuracy = clamp(accuracy, 0, 100)

    streak = random.randint(0, 15)

    # Mastery score
    mastery = (
        accuracy * 0.40 +
        consistency * 0.20 +
        improvement * 0.10 +
        streak * 1.5 +
        (20 - avg_time) * 1.5 +
        (6 - hints) * 2 +
        np.random.normal(0, 3)
    )

    mastery = clamp(mastery, 0, 100)

    if mastery >= 90:
        recommendation = "challenge"

    elif mastery >= 75:
        recommendation = "advance"

    elif mastery >= 55:
        recommendation = "practice"

    else:
        recommendation = "review"

    rows.append({
        "planet": planet,
        "accuracy": round(accuracy, 2),
        "avg_time": round(avg_time, 2),
        "hints": hints,
        "retries": retries,
        "improvement": round(improvement, 2),
        "consistency": round(consistency, 2),
        "streak": streak,
        "recommendation": recommendation
    })

df = pd.DataFrame(rows)

df.to_csv("student_data.csv", index=False)

print(df.head())

print("\nRecommendation counts:\n")
print(df["recommendation"].value_counts())

print("\nDataset saved to student_data.csv")