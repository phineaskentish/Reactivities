import { format } from "date-fns"
import { makeAutoObservable, runInAction } from "mobx"
import { Activity, ActivityFormValues } from "../../models/activity"
import { Profile } from "../../models/Profile"
import agent from "../agent"
import { store } from "./Store"

// This is a store, it is globally accessible like this:
// 
//      import { useStore } from '../api/stores/Store';
//      const {activityStore} = useStore()
//      console.log(activityStore.activities)
// 

export default class ActivityStore {  
    activities: Activity[] = []
    activityRegistry = new Map<string, Activity>()
    selectedActivity: Activity | undefined = undefined
    editMode = false
    loading = false
    loadingInitial = true    

    
    constructor() {
        // This function will turn all properties and methods into observables and actions
        makeAutoObservable(this)
    }

    get activitiesByDate() {
        return Array.from(this.activityRegistry.values()).sort((a, b) => 
            a.date!.getTime() - b.date!.getTime())
    }

    get groupedActivities() {
        return Object.entries(
            this.activitiesByDate.reduce((activities, activity) => {
                const date = format(activity.date!, "dd MMM yyyy")
                activities[date] = activities[date] ? [...activities[date], activity] : [activity]                
                return activities
            }, {} as {[key: string]: Activity[]})
        )
    }
    
    loadActivities = async () => {  
        this.setLoadingInitial(true)      
        try {
            const activities = await agent.Activities.list()            
            activities.forEach(activity => {
                this.setActivity(activity)
            })
            this.setLoadingInitial(false)
        } catch (error) {
            console.log("Error", error)            
            this.setLoadingInitial(false)            
        }
    }

    loadActivity = async (id: string) => {
        let activity = this.getActivity(id)
        if(activity) {
            this.selectedActivity = activity
            return activity
        } else {
            this.loadingInitial = true
            try {
                activity = await agent.Activities.details(id)
                this.setActivity(activity)
                runInAction(() => {
                    this.selectedActivity = activity
                })                
                this.setLoadingInitial(false)
                return activity
            } catch (error) {
                console.log(error)
                this.setLoadingInitial(false)
            }
        }
    }

    private setActivity = (activity: Activity) => {        
        var user = store.userStore.user
        if (user) {
            activity.isGoing = activity.attendees!.some(
                a => a.username === user?.username
            )
            activity.isHost = activity.hostUsername === user.username
            activity.host = activity.attendees?.find(u => u.username === activity.hostUsername)
        }
        activity.date = new Date(activity.date!)
        this.activityRegistry.set(activity.id, activity)     
    }

    private getActivity = (id: string) => {
        return this.activityRegistry.get(id)
    }

    setLoadingInitial = (state: boolean) => {
        this.loadingInitial = state
    }

    createActivity = async (activity: ActivityFormValues) => {
        const user = store.userStore.user
        const attendee = new Profile(user!)
        try {
            await agent.Activities.create(activity)
            const newActivity = new Activity(activity)
            newActivity.hostUsername = user!.username
            newActivity.attendees = [attendee]
            this.setActivity(newActivity)
            runInAction(() => {                                
                this.selectedActivity = newActivity
            })
        } catch (error) {
            console.log(error.response)
        }
	}

    updateActivity = async (activity: ActivityFormValues) => {        
        try {
            await agent.Activities.update(activity)
            runInAction(() => {
                if (activity.id) {
                    let updatedActivity = {...this.getActivity(activity.id), ...activity}
                    this.activityRegistry.set(activity.id, updatedActivity as Activity)
                    this.selectedActivity = updatedActivity as Activity
                }                                                
            })
        } catch (error) {
            console.log(error)
        }
	}

    deleteActivity = async (id: string) => {
        this.loading = true
        try {
            await agent.Activities.delete(id)
            runInAction(() => {
                // this.activities = [...this.activities.filter(act => act.id !== id)]
                this.activityRegistry.delete(id)                
                this.loading = false
            })
        } catch (error) {
            console.log(error.response)
            runInAction(() => {              
                this.loading = false                
            })
        }
    }

    updateAttendance = async () => {
        const user = store.userStore.user
        this.loading = true
        try {
            await agent.Activities.attend(this.selectedActivity!.id)
            runInAction(() => {
                if(this.selectedActivity?.isGoing) {
                    this.selectedActivity.attendees = this.selectedActivity.attendees?.filter(a => a.username !== user?.username)
                    this.selectedActivity.isGoing = false
                }else{
                    const attendee = new Profile(user!)
                    this.selectedActivity?.attendees?.push(attendee)
                    this.selectedActivity!.isGoing = true
                }
                this.activityRegistry.set(this.selectedActivity!.id, this.selectedActivity!)
            })
        } catch (error) {
            console.log(error)
        } finally {
            runInAction(() => this.loading = false)
        }
    }

    cancelActivitiyToggle = async () => {
        this.loading = true
        try {
            await agent.Activities.attend(this.selectedActivity!.id)
            runInAction(() => {
                this.selectedActivity!.isCancelled = !this.selectedActivity?.isCancelled
                this.activityRegistry.set(this.selectedActivity!.id, this.selectedActivity!)
            })            
        } catch (error) {
            console.log(error)
        } finally {
            runInAction(() => this.loading = false)
        }
    }

    clearSelectedActivity = () => {
        this.selectedActivity = undefined
    }
}