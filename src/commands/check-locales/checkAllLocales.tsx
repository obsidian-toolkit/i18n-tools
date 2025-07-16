import { render } from 'ink';

import { AllLocalesView } from './ui/AllLocalesView';
import { getData } from './utils/getData';

export async function checkAllLocales() {
    const data = await getData();
    render(<AllLocalesView data={data} />);
}
