import { parseISO, startOfDay, addDays } from 'date-fns';
import { Site, Holiday, SiteStatus, StepName, Step, UserConfig } from '../types';
import { isWorkingDay, addWorkdays, getWorkingDayOnOrAfter, calculateRevisitDate } from '../utils/dateUtils';
import { MAX_CAPACITY } from '../constants';

export class SchedulingEngine {
  private holidays: Holiday[];
  private config: UserConfig;
  private capacityUsage: Map<StepName, Map<string, number>> = new Map();

  constructor(holidays: Holiday[], config: UserConfig) {
    this.holidays = holidays;
    this.config = config;
    Object.values(StepName).forEach(name => {
      this.capacityUsage.set(name, new Map());
    });
  }

  private isSlotAvailable(date: Date, type: StepName): boolean {
    const dateStr = startOfDay(date).toISOString();
    const currentCount = this.capacityUsage.get(type)?.get(dateStr) || 0;
    return currentCount < MAX_CAPACITY[type];
  }

  private reserveSlot(date: Date, type: StepName) {
    const dateStr = startOfDay(date).toISOString();
    const typeUsage = this.capacityUsage.get(type)!;
    typeUsage.set(dateStr, (typeUsage.get(dateStr) || 0) + 1);
  }

  private findNextAvailableSlot(startDate: Date, duration: number, type: StepName): { start: Date; finish: Date } {
    let currentStart = getWorkingDayOnOrAfter(startDate, this.holidays);
    
    if (type === StepName.SITE_VISIT && currentStart.getDay() === 5) {
      currentStart = getWorkingDayOnOrAfter(addDays(currentStart, 1), this.holidays, true);
    }

    while (true) {
      let tempDate = currentStart;
      let possible = true;
      let daysFound = 0;
      
      while (daysFound < duration) {
        if (type === StepName.SITE_VISIT && tempDate.getDay() === 5) {
          possible = false;
          break;
        }

        if (!this.isSlotAvailable(tempDate, type)) {
          possible = false;
          break;
        }

        let next = addDays(tempDate, 1);
        while (!isWorkingDay(next, this.holidays)) next = addDays(next, 1);
        
        daysFound++;
        if (daysFound < duration) tempDate = next;
      }

      if (possible) {
        let reserveDate = currentStart;
        for (let i = 0; i < duration; i++) {
          this.reserveSlot(reserveDate, type);
          if (i < duration - 1) {
            let next = addDays(reserveDate, 1);
            while (!isWorkingDay(next, this.holidays)) next = addDays(next, 1);
            reserveDate = next;
          }
        }
        return { start: currentStart, finish: reserveDate };
      } else {
        let next = addDays(currentStart, 1);
        while (!isWorkingDay(next, this.holidays)) next = addDays(next, 1);
        currentStart = next;
      }
    }
  }

  public scheduleAll(sites: Site[]): Site[] {
    this.capacityUsage.forEach(map => map.clear());
    
    const sortedSites = [...sites].sort((a, b) => {
      if (a.status === SiteStatus.BOOKED && b.status === SiteStatus.TBC) return -1;
      if (a.status === SiteStatus.TBC && b.status === SiteStatus.BOOKED) return 1;

      if (this.config.sortMode === 'Name') {
        return a.name.localeCompare(b.name);
      } else if (this.config.sortMode === 'Date') {
        const aDate = a.bookedStartDate ? parseISO(a.bookedStartDate).getTime() : a.createdAt;
        const bDate = b.bookedStartDate ? parseISO(b.bookedStartDate).getTime() : b.createdAt;
        return aDate - bDate;
      }
      
      if (a.status === SiteStatus.BOOKED && b.status === SiteStatus.BOOKED && a.bookedStartDate && b.bookedStartDate) {
        return parseISO(a.bookedStartDate).getTime() - parseISO(b.bookedStartDate).getTime();
      }
      return a.order - b.order;
    });

    return sortedSites.map(site => {
      const updatedSteps: Step[] = [];
      const workflowOrder = [
        StepName.PRE_WORK, 
        StepName.SITE_VISIT, 
        StepName.REPORT_WRITING, 
        StepName.FINAL_PRESENTATION, 
        StepName.REVISIT
      ].filter(stepName => {
        const isGlobalIncluded = stepName !== StepName.REVISIT || this.config.includeRevisit;
        const isSiteExcluded = site.excludedSteps?.includes(stepName);
        return isGlobalIncluded && !isSiteExcluded;
      });

      const requiredForRevisit = [StepName.PRE_WORK, StepName.SITE_VISIT, StepName.REPORT_WRITING, StepName.FINAL_PRESENTATION];
      const allPriorDone = requiredForRevisit.every(name => {
        const step = site.steps.find(s => s.name === name);
        return step?.done === true;
      });

      let lastFinish: Date = site.bookedStartDate
        ? parseISO(site.bookedStartDate) 
        : getWorkingDayOnOrAfter(new Date(), this.holidays);

      let finalPresentationFinish: string | null = null;

      workflowOrder.forEach((stepName, idx) => {
        if (stepName === StepName.REVISIT && !allPriorDone) return;

        const existingStep = site.steps.find(s => s.name === stepName);
        const duration = site.customDurations?.[stepName] ?? existingStep?.durationWorkdays ?? this.config.defaultDurations[stepName];
        
        let start: Date;
        let finish: Date;

        if (existingStep?.done || existingStep?.manualStartDate) {
          const lockDate = existingStep.manualStartDate || existingStep.startDate;
          start = getWorkingDayOnOrAfter(parseISO(lockDate), this.holidays);
          finish = addWorkdays(start, duration, this.holidays);
          this.reserveSlot(start, stepName); 
        } else if (stepName === StepName.REVISIT && finalPresentationFinish) {
          start = calculateRevisitDate(finalPresentationFinish, this.holidays, this.config.revisitOffsetMonths);
          finish = addWorkdays(start, duration, this.holidays);
          this.reserveSlot(start, stepName);
        } else {
          const earliestPossible = idx === 0 ? lastFinish : addDays(lastFinish, 1);
          const range = this.findNextAvailableSlot(earliestPossible, duration, stepName);
          start = range.start;
          finish = range.finish;
        }

        const isConfirmed = existingStep?.isConfirmed ?? (site.status === SiteStatus.BOOKED);
        const isTentative = !isConfirmed;

        updatedSteps.push({
          id: existingStep?.id || `${site.id}-${stepName}`,
          siteId: site.id,
          name: stepName,
          durationWorkdays: duration,
          startDate: start.toISOString(),
          finishDate: finish.toISOString(),
          done: existingStep?.done ?? false,
          locked: existingStep?.locked ?? false,
          isTentative: isTentative,
          isConfirmed: isConfirmed,
          manualStartDate: existingStep?.manualStartDate
        });

        if (stepName === StepName.FINAL_PRESENTATION) {
          finalPresentationFinish = finish.toISOString();
        }
        lastFinish = finish;
      });

      return { ...site, steps: updatedSteps };
    });
  }
}