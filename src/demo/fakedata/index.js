/*
 * TODO: Remove this folder of fake data. 
 * See [#26](https://github.com/hms-dbmi/cistrome-higlass-wrapper/issues/26) for more info.
 */
import rowInfo1 from './cistrome-track-1/rowInfo.json';
import rowInfo2 from './cistrome-track-2/rowInfo.json';

export default {
    "cistrome-track-1": {
        tilesetInfo: {
            rowInfo: rowInfo1
        }
    },
    "cistrome-track-2": {
        tilesetInfo: {
            rowInfo: rowInfo2
        }
    }
};