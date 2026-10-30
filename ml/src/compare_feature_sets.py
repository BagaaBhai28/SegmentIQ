"""Compare numeric-only and mixed-feature K-Means representations."""
from __future__ import annotations
import json
from itertools import combinations
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import adjusted_rand_score, silhouette_score, davies_bouldin_score, calinski_harabasz_score
from sklearn.cluster import KMeans

DATA = Path('ml/data/raw/Indian_Personal_Finance_Behavior_Dataset_2026.csv')
NUMERIC = ['Age','Monthly_Income_INR','Monthly_Expenses_INR','Savings_Percentage','Monthly_Debt_Payment_INR','Financial_Literacy_Score']
CATEGORICAL = ['Investment_Type','Debt_Status','Has_Health_Insurance','Has_Life_Insurance','Has_Emergency_Fund','Uses_Financial_Apps','Primary_Financial_Goal','Savings_Channel']
SEEDS = [0,17,42,73,101]
K_VALUES = range(2,9)

def score(values, name):
 rows=[]
 for k in K_VALUES:
  all_labels=[]; sil=[]; db=[]; ch=[]
  for seed in SEEDS:
   model=KMeans(n_clusters=k,random_state=seed,n_init=20)
   labels=model.fit_predict(values)
   all_labels.append(labels)
   sil.append(float(silhouette_score(values,labels)))
   db.append(float(davies_bouldin_score(values,labels)))
   ch.append(float(calinski_harabasz_score(values,labels)))
  ari=[adjusted_rand_score(all_labels[i],all_labels[j]) for i,j in combinations(range(len(SEEDS)),2)]
  rows.append({'feature_set':name,'k':k,'silhouette_mean':float(np.mean(sil)),'davies_bouldin_mean':float(np.mean(db)),'calinski_harabasz_mean':float(np.mean(ch)),'seed_ari_mean':float(np.mean(ari)),'seed_ari_min':float(np.min(ari))})
 return rows

df=pd.read_csv(DATA,keep_default_na=False)
numeric=df[NUMERIC].apply(pd.to_numeric,errors='raise')
num_matrix=StandardScaler().fit_transform(numeric)
preprocessor=ColumnTransformer([
 ('numeric',StandardScaler(),NUMERIC),
 ('categorical',OneHotEncoder(handle_unknown='ignore',sparse_output=False),CATEGORICAL),
],remainder='drop')
mixed_matrix=preprocessor.fit_transform(df)
results=score(num_matrix,'numeric_only')+score(mixed_matrix,'numeric_plus_observed_behavior')
report={'rows':len(df),'numeric_features':NUMERIC,'observed_behavior_features':CATEGORICAL,'risk_tolerance_role':'held out for external comparison','categorical_encoding':'one-hot; no ordinal order imposed','cleaning':'no row or value changes','scores':results}
Path('ml/reports/feature_set_comparison.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'numeric_only': [r for r in results if r['feature_set']=='numeric_only'],'numeric_plus_observed_behavior':[r for r in results if r['feature_set']=='numeric_plus_observed_behavior']},indent=2))
