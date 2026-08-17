import json

import pandas as pd

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)

from sklearn.model_selection import train_test_split

from sklearn.tree import (
    DecisionTreeClassifier,
    export_text,
)


# ============================================================
# Load Dataset
# ============================================================

df = pd.read_csv("student_data.csv")

print("\n==============================")
print("Dataset loaded")
print("==============================")

print(f"\nNumber of students: {len(df)}")

print("\nColumns:")
print(list(df.columns))


# ============================================================
# Prepare Features
# ============================================================
#
# These are the things the real app could eventually know
# about a student.
#
# IMPORTANT:
# We intentionally DO NOT include:
#
#   profile
#   mastery
#
# Those are synthetic information used only when generating
# our training dataset.
# ============================================================

FEATURE_COLUMNS = [
    "planet",
    "lesson_difficulty",
    "accuracy",
    "avg_time",
    "hints",
    "retries",
    "improvement",
    "consistency",
    "streak",
]


X = df[FEATURE_COLUMNS]

y = df["recommendation"]


print("\nFeatures used by the model:")
for feature in FEATURE_COLUMNS:
    print(f"  - {feature}")


print("\nRecommendations:")
print(y.value_counts())


# ============================================================
# Train/Test Split
# ============================================================
#
# 80% → training
# 20% → testing
#
# stratify=y keeps the recommendation categories reasonably
# balanced between the two sets.
# ============================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)


print("\n==============================")
print("Train/Test Split")
print("==============================")

print(f"\nTraining examples: {len(X_train)}")
print(f"Testing examples:  {len(X_test)}")


# ============================================================
# Train Decision Tree
# ============================================================

model = DecisionTreeClassifier(
    max_depth=5,
    random_state=42,
)


print("\n==============================")
print("Training model...")
print("==============================")


model.fit(
    X_train,
    y_train,
)


print("Training complete!")


# ============================================================
# Evaluate Model
# ============================================================

predictions = model.predict(X_test)


accuracy = accuracy_score(
    y_test,
    predictions,
)


print("\n==============================")
print("Model Evaluation")
print("==============================")


print(f"\nAccuracy: {accuracy:.3f}")


print("\nClassification Report:\n")

print(
    classification_report(
        y_test,
        predictions,
        zero_division=0,
    )
)


# ============================================================
# Confusion Matrix
# ============================================================

labels = model.classes_

matrix = confusion_matrix(
    y_test,
    predictions,
    labels=labels,
)


print("Confusion Matrix:")

print(
    pd.DataFrame(
        matrix,
        index=[f"Actual: {label}" for label in labels],
        columns=[f"Predicted: {label}" for label in labels],
    )
)


# ============================================================
# Feature Importance
# ============================================================
#
# This tells us which student behaviors the model found
# most useful for making recommendations.
# ============================================================

importance = pd.DataFrame(
    {
        "feature": FEATURE_COLUMNS,
        "importance": model.feature_importances_,
    }
)

importance = importance.sort_values(
    by="importance",
    ascending=False,
)


print("\n==============================")
print("Feature Importance")
print("==============================")

for _, row in importance.iterrows():

    print(
        f"{row['feature']:20s}"
        f"{row['importance']:.3f}"
    )


# ============================================================
# Human-Readable Tree
# ============================================================

print("\n==============================")
print("Decision Tree")
print("==============================")


tree_rules = export_text(
    model,
    feature_names=FEATURE_COLUMNS,
)


print(tree_rules)


# ============================================================
# Export Model
# ============================================================
#
# We don't export the entire sklearn object because React
# cannot directly use a Python sklearn model.
#
# Instead, we export the tree's structure:
#
#   children_left
#   children_right
#   feature
#   threshold
#   classes
#   values
#
# TypeScript can use this information later to reproduce
# exactly the same predictions.
# ============================================================

tree = model.tree_


tree_data = {
    "children_left": [int(x) for x in tree.children_left],
    "children_right": [int(x) for x in tree.children_right],
    "feature": [int(x) for x in tree.feature],
    "threshold": [float(x) for x in tree.threshold],
    "classes": [str(x) for x in model.classes_],
    "values": tree.value.tolist(),
    "feature_names": FEATURE_COLUMNS,
    "max_depth": int(model.get_depth()),
    "n_classes": int(model.n_classes_),
}


with open(
    "decision_tree.json",
    "w",
) as file:

    json.dump(
        tree_data,
        file,
        indent=2,
    )


print("\n==============================")
print("Model exported!")
print("==============================")

print("\nSaved:")
print("decision_tree.json")

print("\n🎉 Milestone 1 + initial model training complete!")