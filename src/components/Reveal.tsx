import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MOTION } from '../theme/tokens';

interface RevealProps {
  children: ReactNode;
  /** Position in the sibling group; multiplied by the stagger token. */
  index?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Staggered entrance for a group of cards.
 *
 * Centralizes the reveal so every screen uses one rhythm — previously each
 * screen hand-picked delays (120, 200, 280, 360…) and they drifted apart.
 * Index-based so reordering a list can't leave a gap in the cascade.
 */
const Reveal = ({ children, index = 0, style }: RevealProps) => (
  <Animated.View
    entering={FadeInDown.delay(index * MOTION.stagger)
      .duration(MOTION.base)
      .springify()
      .damping(MOTION.springSoft.damping)
      .stiffness(MOTION.springSoft.stiffness)}
    style={style}
  >
    {children}
  </Animated.View>
);

export default Reveal;
