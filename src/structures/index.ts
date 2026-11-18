import { chainDef, openDef } from './hash';
import { heapDef } from './heap';
import { circularDef, queueDef, stackDef } from './linear';
import { doublyDef, singlyDef } from './linkedList';
import { avlDef, bstDef } from './tree';
import { erase, type StructureDef } from './types';

/** Para agregar una estructura: definir su StructureDef y sumarla acá. */
export const STRUCTURES: readonly StructureDef<unknown>[] = [
  erase(stackDef),
  erase(queueDef),
  erase(circularDef),
  erase(singlyDef),
  erase(doublyDef),
  erase(bstDef),
  erase(avlDef),
  erase(heapDef),
  erase(chainDef),
  erase(openDef),
];
