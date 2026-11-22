import {notFound} from "next/navigation";
import {Workspace} from "../../components/panel/workspace";
import {sections,type Section} from "../../lib/panel";
export default async function Page({params}:{params:Promise<{section:string}>}){
 const {section}=await params;if(!Object.hasOwn(sections,section))notFound();
 return <Workspace key={section} section={section as Section}/>;
}
