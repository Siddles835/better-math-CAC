import random

import numpy as np
import pandas as pd


# ============================================================
# Configuration
# ============================================================

NUM_STUDENTS = 5000

# Makes the generated dataset reproducible.
random.seed(42)
np.random.seed(42)


# ============================================================
# Student Profiles
# ============================================================
#
# These profiles are ONLY used to create realistic synthetic
# students. The ML model will NOT be given the profile.
#
# The model has to infer what recommendation makes sense
# from the student's actual performance.
# ============================================================

student_profiles = [
    ("fast", 0.20),
    ("steady", 0.35),
    ("careful", 0.20),
    ("struggling", 0.20),
    ("gifted", 0.05),
]

profile_names = [profile[0] for profile in student_profiles]
profile_weights = [profile[1] for profile in student_profiles]


def clamp(value, minimum, maximum):
    """Keep a number between minimum and maximum."""
    return max(minimum, min(maximum, value))


# ============================================================
# Generate Students
# ============================================================

rows = []

for _ in range(NUM_STUDENTS):

    profile = random.choices(
        profile_names,
        weights=profile_weights,
        k=1,
    )[0]

    # --------------------------------------------------------
    # Planet
    # --------------------------------------------------------
    #
    # 1 = easiest / closest to Sun
    # 9 = hardest / farthest from Sun
    #
    # This roughly mirrors the app's progression system.
    # --------------------------------------------------------

    planet = random.randint(1, 9)

    # --------------------------------------------------------
    # Generate behavior based on student profile
    # --------------------------------------------------------

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

    else:  # struggling

        accuracy = random.uniform(35, 70)
        avg_time = random.uniform(8, 18)
        hints = random.randint(3, 6)
        retries = random.randint(2, 5)
        improvement = random.uniform(-5, 5)
        consistency = random.uniform(40, 75)

    # --------------------------------------------------------
    # Lesson difficulty
    # --------------------------------------------------------
    #
    # Difficulty generally increases farther from the Sun.
    # Some randomness prevents this from being perfectly
    # predictable.
    # --------------------------------------------------------

    lesson_difficulty = planet + random.choice([-1, 0, 0, 0, 1])

    lesson_difficulty = clamp(
        lesson_difficulty,
        1,
        10,
    )

    # --------------------------------------------------------
    # Harder lessons affect performance
    # --------------------------------------------------------

    difficulty_factor = lesson_difficulty - 1

    accuracy -= difficulty_factor * random.uniform(0.3, 1.0)

    avg_time += difficulty_factor * random.uniform(0.1, 0.4)

    accuracy = clamp(
        accuracy,
        0,
        100,
    )

    # --------------------------------------------------------
    # Other behavioral features
    # --------------------------------------------------------

    streak = random.randint(0, 15)

    # --------------------------------------------------------
    # Synthetic mastery score
    # --------------------------------------------------------
    #
    # IMPORTANT:
    # This is only used to CREATE synthetic labels.
    #
    # The ML model will NOT see this score.
    #
    # Multiple factors influence mastery so that the model
    # has a meaningful pattern to learn.
    # --------------------------------------------------------

    speed_score = clamp(
        100 - (avg_time / 20) * 100,
        0,
        100,
    )

    hint_score = clamp(
        100 - (hints / 6) * 100,
        0,
        100,
    )

    streak_score = clamp(
        (streak / 15) * 100,
        0,
        100,
    )

    improvement_score = clamp(
        improvement * 5 + 50,
        0,
        100,
    )

    mastery = (
        accuracy * 0.45
        + consistency * 0.20
        + improvement_score * 0.10
        + speed_score * 0.10
        + hint_score * 0.05
        + streak_score * 0.10
    )

    # Humans aren't perfectly predictable.
    mastery += np.random.normal(0, 4)

    mastery = clamp(
        mastery,
        0,
        100,
    )

    # --------------------------------------------------------
    # Create recommendation label
    # --------------------------------------------------------

    if mastery >= 90:

        recommendation = "challenge"

    elif mastery >= 75:

        recommendation = "advance"

    elif mastery >= 55:

        recommendation = "practice"

    else:

        recommendation = "review"

    # --------------------------------------------------------
    # Save row
    # --------------------------------------------------------

    rows.append(
        {
            # Used for analyzing our synthetic dataset.
            # NOT used by the ML model.
            "profile": profile,

            "planet": planet,

            "lesson_difficulty": lesson_difficulty,

            "accuracy": round(accuracy, 2),

            "avg_time": round(avg_time, 2),

            "hints": hints,

            "retries": retries,

            "improvement": round(improvement, 2),

            "consistency": round(consistency, 2),

            "streak": streak,

            # Useful for analyzing the generated data,
            # but NOT used by the ML model.
            "mastery": round(mastery, 2),

            "recommendation": recommendation,
        }
    )


# ============================================================
# Create DataFrame
# ============================================================

df = pd.DataFrame(rows)


# ============================================================
# Save Dataset
# ============================================================

df.to_csv(
    "student_data.csv",
    index=False,
)


# ============================================================
# Print Dataset Information
# ============================================================

print("\n==============================")
print("Dataset generated!")
print("==============================")

print(f"\nStudents: {len(df)}")

print("\nFirst five rows:")
print(df.head())

print("\nRecommendation counts:")
print(df["recommendation"].value_counts())

print("\nStudent profile counts:")
print(df["profile"].value_counts())

print("\nDataset statistics:")
print(
    df[
        [
            "accuracy",
            "avg_time",
            "hints",
            "retries",
            "improvement",
            "consistency",
            "streak",
            "lesson_difficulty",
            "mastery",
        ]
    ].describe()
)

print("\nSaved to:")
print("student_data.csv")