"""Reproducible synthetic telemetry benchmark. No physical machine data used."""
import json
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score

ROOT = Path(__file__).parent
NAMES = ['normal', 'extrusion blockage', 'thermal instability', 'mechanical vibration']
FEATURES = ['temperature_std_c', 'temperature_slope_c_per_sample', 'motor_mean_a', 'vibration_mean_mm_s', 'extrusion_mean_mm_s', 'extrusion_slope_mm_s_per_sample']

def features(a):
    t = np.arange(len(a)); t = t - t.mean()
    return [a[:,0].std(), (t*a[:,0]).sum()/(t*t).sum(), a[:,2].mean(), a[:,1].mean(), a[:,3].mean(), (t*a[:,3]).sum()/(t*t).sum()]

def dataset(seed, count):
    rng = np.random.default_rng(seed)
    X, y = [], []
    for label in range(4):
        for _ in range(count):
            n = 30; t = np.arange(n); severity = rng.uniform(.2, 1)
            temp = rng.uniform(203, 218) + rng.normal(0, rng.uniform(.3, 1.4), n)
            vib = rng.uniform(.7, 1.8) + rng.normal(0, .18, n)
            motor = rng.uniform(1.0, 1.65) + rng.normal(0, .12, n)
            ext = rng.uniform(3.7, 4.9) + rng.normal(0, .14, n)
            if label == 1:
                ext -= severity * (1.3 + t*.055)
                motor += severity * (1.2 + t*.028)
            elif label == 2:
                temp += np.sin(t*.75)*severity*9 + t*severity*.32
            elif label == 3:
                vib += severity*(3 + t*.085)
                motor += severity*.6
            a = np.array([temp, np.maximum(.01,vib), np.maximum(.01,motor), np.maximum(.01,ext)]).T
            X.append(features(a)); y.append(label)
    return np.array(X), np.array(y)

X, y = dataset(41, 900)
Xt, yt = dataset(2026, 300)
scaler = StandardScaler().fit(X)
classifier = LogisticRegression(C=.7, max_iter=1500).fit(scaler.transform(X), y)
pred = classifier.predict(scaler.transform(Xt))
healthy = X[y==0]
artifact = dict(featureNames=FEATURES, classes=NAMES, mean=scaler.mean_.tolist(), scale=scaler.scale_.tolist(), weights=classifier.coef_.tolist(), intercept=classifier.intercept_.tolist(), healthyMean=healthy.mean(axis=0).tolist(), healthyStd=healthy.std(axis=0).tolist(), evaluation=dict(accuracy=float(accuracy_score(yt,pred)), macroF1=float(f1_score(yt,pred,average='macro')), confusion=confusion_matrix(yt,pred).tolist(), trainWindows=len(y), testWindows=len(yt), trainSeed=41, testSeed=2026, source='Synthetic simulator only; held-out random seed, same generator. Not validated on real machines.'))
(ROOT/'dist/model.json').write_text(json.dumps(artifact, indent=2)+'\n')
print(json.dumps(artifact['evaluation'],indent=2))
