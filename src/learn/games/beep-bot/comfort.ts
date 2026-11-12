import {useStore} from '../../../state/Store';
import {learningComfort} from '../../../state/validation';
import {activeLearner} from '../../learners';
/** Both local boards honor the active learner's grown-up comfort setting. */
export function useBeepComfort(){const {save}=useStore();return learningComfort(save,activeLearner(save.learning).id);}
