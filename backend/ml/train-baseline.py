import argparse
import json
import os
from datetime import datetime

import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True, help='CSV path')
    parser.add_argument('--grid', type=float, default=0.01, help='Grid size degrees')
    parser.add_argument('--threshold', type=int, default=3, help='Hotspot threshold')
    parser.add_argument('--out', default='model_registry', help='Output dir')
    return parser.parse_args()


def build_cell_id(lat, lng, grid):
    return f"{int(lat // grid)}:{int(lng // grid)}"


def main():
    args = parse_args()
    df = pd.read_csv(args.input)

    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    df = df.dropna(subset=['timestamp', 'latitude', 'longitude'])

    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['month'] = df['timestamp'].dt.month
    df['lat'] = df['latitude'].astype(float)
    df['lng'] = df['longitude'].astype(float)
    df['cell_id'] = df.apply(lambda r: build_cell_id(r['lat'], r['lng'], args.grid), axis=1)

    cell_counts = df['cell_id'].value_counts().to_dict()
    df['cell_count'] = df['cell_id'].map(cell_counts).fillna(0).astype(int)
    df['is_hotspot'] = (df['cell_count'] >= args.threshold).astype(int)

    features = ['lat', 'lng', 'hour', 'day_of_week', 'month']
    X = df[features]
    y = df['is_hotspot']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = GradientBoostingClassifier()
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    report = classification_report(y_test, y_pred, output_dict=True)

    os.makedirs(args.out, exist_ok=True)
    version = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    model_path = os.path.join(args.out, f'model_{version}.pkl')
    meta_path = os.path.join(args.out, f'model_{version}.json')

    import joblib

    joblib.dump(model, model_path)
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump({
            'version': version,
            'grid': args.grid,
            'threshold': args.threshold,
            'features': features,
            'metrics': report,
            'input': args.input,
            'created_at': datetime.utcnow().isoformat() + 'Z',
        }, f, indent=2)

    print(f'Model saved: {model_path}')
    print(f'Metadata saved: {meta_path}')


if __name__ == '__main__':
    main()
