import { useEffect, useState } from 'react';
import './NatureBackdrop.css';
import forestMist from '../assets/nature/forest-mist.webp';
import calmSea from '../assets/nature/calm-sea.webp';
import rainforestDew from '../assets/nature/rainforest-dew.webp';
import forestWaterfall from '../assets/nature/forest-waterfall.webp';
import oceanHorizon from '../assets/nature/ocean-horizon.webp';

const scenes = [
  { title: 'Misty green forest', src: forestMist },
  { title: 'Still blue sea', src: calmSea },
  { title: 'Rainforest after rain', src: rainforestDew },
  { title: 'Forest waterfall', src: forestWaterfall },
  { title: 'Ocean horizon', src: oceanHorizon },
];
const rotationMs = 18000;

export default function NatureBackdrop() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % scenes.length), rotationMs);
    return () => window.clearTimeout(timer);
  }, [index]);

  return <>
    <div className="nature-backdrop" aria-hidden="true">
      {scenes.map((item, sceneIndex) => <img
        key={item.src}
        className={'nature-backdrop-image' + (sceneIndex === index ? ' is-current' : '')}
        src={item.src}
        alt=""
        aria-hidden="true"
        decoding="async"
        fetchPriority={sceneIndex === index ? 'high' : 'auto'}
      />)}
      <div className="nature-backdrop-wash" />
    </div>
  </>;
}
