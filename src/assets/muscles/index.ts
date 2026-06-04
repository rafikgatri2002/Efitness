import { ImageSourcePropType } from 'react-native';

// Anatomical picture for each muscle group, keyed by lowercased muscle name.
// Add more here as images are provided (abs, cardio still pending).
const muscleImages: Record<string, ImageSourcePropType> = {
  chest: require('./chest.jpg'),
  back: require('./back.webp'),
  biceps: require('./biceps.webp'),
  triceps: require('./triceps.jpg'),
  legs: require('./legs.jpg'),
  shoulders: require('./shoulders.webp')
};

export function getMuscleImage(muscle: string): ImageSourcePropType | undefined {
  return muscleImages[muscle.trim().toLowerCase()];
}
