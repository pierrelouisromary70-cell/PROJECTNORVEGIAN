import { predictRaceTimes, formatRaceTime } from '@/lib/vdot/predictor';
import { formatPace } from '@/lib/vdot/paces';

export function RacePredictor({ vdot }: { vdot: number }) {
  const predictions = predictRaceTimes(vdot);
  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-semibold text-fjord-900">Vos temps prédits</h2>
        <div className="text-sm text-fjord-600">
          VDOT <span className="font-bold text-fjord-900">{vdot}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {predictions.map((p) => (
          <div key={p.distanceLabel} className="rounded-xl bg-fjord-50 p-3">
            <div className="text-xs uppercase tracking-wide text-fjord-600">{p.distanceLabel}</div>
            <div className="text-xl font-bold text-fjord-950 mt-1">{formatRaceTime(p.timeSeconds)}</div>
            <div className="text-xs text-fjord-600">{formatPace(p.pacePerKmSeconds)}/km</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-fjord-600 mt-3">
        Estimations basées sur votre VDOT actuel à effort maximal et avec un entraînement spécifique adapté.
      </p>
    </div>
  );
}
