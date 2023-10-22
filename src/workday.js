import { ICalendar } from 'datebook';

// Dicts to translate between days and abbriviations and days to numers
const daysToAbbrivs = {
    U: 'SU',
    M: 'MO',
    T: 'TU',
    W: 'WE',
    R: 'TH',
    F: 'FR',
    S: 'SA',
};
const daysToNums = {
    SU: 0,
    MO: 1,
    TU: 2,
    WE: 3,
    TH: 4,
    FR: 5,
    SA: 6,
};

// Dict to translate between the table cell locations for the different pages
const tableCellLoci = {
    'View My Courses': {
        course: 4,
        courseType: 5,
        courseStart: 10,
        courseEnd: 11,
        courseInfo: 7,
        instructor: 9,
    },
    'View My Saved Schedules': {
        course: 3,
        courseType: 5,
        courseStart: 7,
        courseEnd: 8,
        courseInfo: 9,
        instructor: 6,
    },
};

// Check if we have already inserted the button
let inserted = false;

// Observe the document body to see if we are the View My Courses page`
const observer = new MutationObserver(() => {
    const header = document.querySelector("span[data-automation-id='pageHeaderTitleText']");
    if (header) {
        if (['View My Saved Schedules', 'View My Courses'].includes(header.innerHTML)) {
            const buttonList = document.querySelectorAll("ul[data-automation-id='buttonBar']");
            if (inserted || (buttonList[0] && buttonList[0].firstChild.lastChild.innerText === 'Download Schedule')) return;
            for (let button of buttonList) {
                insertDownloadButton(button, header.innerHTML);
            }
            inserted = true;
        } else {
            inserted = false;
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});

// Insert the download button by cloning the last button and changing the text
function insertDownloadButton(buttonBarList, pageHeader) {
    const otherButton = buttonBarList.children[buttonBarList.childElementCount - 1];
    const downloadButton = otherButton.cloneNode(true);
    if (downloadButton.firstChild.tagName === 'DIV') {
        downloadButton.firstChild.firstChild.lastChild.innerText = 'Download Schedule';
    } else {
        downloadButton.firstChild.lastChild.innerText = 'Download Schedule';
    }
    downloadButton.firstChild.onclick = () => {
        downloadSchedule(buttonBarList.offsetParent.querySelectorAll("tr[data-automation-id='row']"), pageHeader);
    };
    buttonBarList.appendChild(downloadButton);
}

// Download the schedule as an ICS file by reading the table and using the datebook library
function downloadSchedule(tableRows, pageHeader) {
    let cal;
    if (!tableRows) return;
    for (let row of tableRows) {
        if (pageHeader == 'View My Courses' && row.parentElement.parentElement.caption?.innerText !== 'My Enrolled Courses') continue;
        const cellLoci = tableCellLoci[pageHeader];
        const course = row.cells[cellLoci.course].querySelector("div[data-automation-id='promptOption']").innerHTML;
        const courseType = row.cells[cellLoci.courseType].querySelector("div[data-automation-id='promptOption']").innerHTML;
        const courseStart = row.cells[cellLoci.courseStart].querySelector("div[data-automation-id='textView']").innerHTML;
        const courseEnd = row.cells[cellLoci.courseEnd].querySelector("div[data-automation-id='textView']").innerHTML;
        let courseInfo = row.cells[cellLoci.courseInfo].querySelector("div[data-automation-id='promptOption']");
        const instructor = row.cells[cellLoci.instructor].querySelector("div[data-automation-id='promptOption']")?.innerHTML;
        if (!courseInfo) continue;
        courseInfo = courseInfo.innerHTML.split('|');
        const courseDays = courseInfo[0]
            .trim()
            .split('-')
            .map((day) => daysToAbbrivs[day]);
        const courseTimes = courseInfo[1].split('-');
        const courseLocation = courseInfo[2];
        const realStartDay = new Date(courseStart);
        realStartDay.setDate(realStartDay.getDate() + (daysToNums[courseDays[0]] - realStartDay.getDay()));
        const repeatRule = {
            frequency: 'WEEKLY',
            weekdays: courseDays,
            interval: 1,
            end: new Date(`${courseEnd} 11:59 pm`),
        };

        const newEvent = new ICalendar({
            title: `[${courseType}] ${course}`,
            location: courseLocation,
            description: `Instructor: ${instructor}`,
            start: new Date(`${realStartDay.toDateString()} ${courseTimes[0]}`),
            end: new Date(`${realStartDay.toDateString()} ${courseTimes[1]}`),
            recurrence: repeatRule,
        });
        cal = cal ? cal.addEvent(newEvent) : new ICalendar(newEvent);
    }
    cal.download('workday-schedule.ics');
}
