import pandas as pd
import json

from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report
)


# =========================
# Load Dataset
# =========================

df = pd.read_csv("student_data.csv")

print("Dataset loaded!")
print(df.head())


# =========================
# Prepare Features
# =========================

# Remove the thing we are trying to predict
X = df.drop(columns=["recommendation"])

# What the model learns to predict
y = df["recommendation"]


# =========================
# Split Data
# =========================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)


# =========================
# Train Model
# =========================

model = DecisionTreeClassifier(
    max_depth=5,
    random_state=42
)

print("\nTraining model...")

model.fit(
    X_train,
    y_train
)


# =========================
# Test Model
# =========================

predictions = model.predict(X_test)

print("\nAccuracy:")
print(accuracy_score(y_test, predictions))


print("\nClassification Report:\n")
print(
    classification_report(
        y_test,
        predictions
    )
)


# =========================
# Feature Importance
# =========================

importance = pd.DataFrame({
    "Feature": X.columns,
    "Importance": model.feature_importances_
})


importance = importance.sort_values(
    by="Importance",
    ascending=False
)


print("\nFeature Importance:\n")
print(importance)


# =========================
# Print Human Readable Tree
# =========================

tree_rules = export_text(
    model,
    feature_names=list(X.columns)
)


print("\nDecision Tree:\n")
print(tree_rules)


# =========================
# Export Tree For React
# =========================

tree = model.tree_

tree_data = {

    # Which node to go left/right
    "children_left":
        tree.children_left.tolist(),

    "children_right":
        tree.children_right.tolist(),

    # Which feature is checked at each node
    "feature":
        tree.feature.tolist(),

    # The cutoff value
    "threshold":
        tree.threshold.tolist(),

    # Possible predictions
    "classes":
        model.classes_.tolist(),

    # Prediction counts at leaves
    "values":
        tree.value.tolist()
}


with open(
    "decision_tree.json",
    "w"
) as file:

    json.dump(
        tree_data,
        file,
        indent=2
    )


print("\nSaved decision_tree.json 🚀")