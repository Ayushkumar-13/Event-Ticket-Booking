import { useEvents as useEventsContext } from '../context/EventContext';

export const useEvents = () => {
    return useEventsContext();
}

export default useEvents;
