from controllers import procesos_controller

print("lista de procesos: \n" + str(procesos_controller.listar_procesos()))

print("\n\n\nprocesos agrupados: \n" + str(procesos_controller._agrupar_por_nombre(procesos_controller.listar_procesos())))