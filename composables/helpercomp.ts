import { helper1, helper2 } from "../helpers/helper1"

export function composable1(x: string, store){
    utils1("ram1");
    helper1("shyam1");
    console.log(1,x)
    console.log(store().getLangCode);
    console.log(titleCase("gjdfhmbj"));
}

export function composable2(x: string){
    utils2("ram2");
    helper2("shyam2");
    console.log(2,x)
}